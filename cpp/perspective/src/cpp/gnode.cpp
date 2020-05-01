/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

#include <perspective/first.h>
#include <perspective/context_one.h>
#include <perspective/context_two.h>
#include <perspective/context_zero.h>
#include <perspective/context_grouped_pkey.h>
#include <perspective/gnode.h>
#include <perspective/gnode_state.h>
#include <perspective/mask.h>
#include <perspective/tracing.h>
#include <perspective/env_vars.h>
#include <perspective/logtime.h>
#include <perspective/utils.h>

namespace perspective {

t_tscalar
calc_delta(t_value_transition trans, t_tscalar oval, t_tscalar nval) {
    return nval.difference(oval);
}

t_tscalar
calc_newer(t_value_transition trans, t_tscalar oval, t_tscalar nval) {
    if (nval.is_valid())
        return nval;
    return oval;
}

t_tscalar
calc_negate(t_tscalar val) {
    return val.negate();
}

t_gnode::t_gnode(const t_schema& input_schema, const t_schema& output_schema)
    : m_mode(NODE_PROCESSING_SIMPLE_DATAFLOW)
    , m_gnode_type(GNODE_TYPE_PKEYED)
    , m_input_schema(input_schema)
    , m_output_schema(output_schema)
    , m_init(false)
    , m_id(0)
    , m_pool_cleanup([]() {}) {
    PSP_TRACE_SENTINEL();
    LOG_CONSTRUCTOR("t_gnode");

    std::vector<t_dtype> trans_types(m_output_schema.size());
    std::vector<t_dtype> diff_types(m_output_schema.size());

    for (t_uindex idx = 0; idx < trans_types.size(); ++idx) {
        trans_types[idx] = DTYPE_UINT8;
        diff_types[idx] = DTYPE_BOOL;
    }

    // Each row contains the transition type of the cell, i.e. on each update
    // how the new value relates to the old value in terms of equality and
    // validity.
    t_schema trans_schema(m_output_schema.columns(), trans_types);

    // Create a schema for the diff data table - columns match that of the
    // master table, but each column contains one boolean value - true
    // when the update contains new values and `on_update` callbacks need
    // to be called, and `false` otherwise.
    t_schema diff_schema(m_output_schema.columns(), diff_types);

    // Each row contains a boolean on whether the row already exists in the
    // master table on `m_state`.
    t_schema existed_schema(
        std::vector<std::string>{"psp_existed"}, std::vector<t_dtype>{DTYPE_BOOL});

    // Schemas for transitional tables
    m_transitional_schemas = std::vector<t_schema>{
        m_input_schema, // flattened table
        m_output_schema, // delta table
        m_output_schema, // prev value table
        m_output_schema, // current value table
        trans_schema, // transitions table
        existed_schema, // existed table
        diff_schema // diff table
    };

    m_epoch = std::chrono::high_resolution_clock::now();
}

t_gnode::~t_gnode() {
    PSP_TRACE_SENTINEL();
    LOG_DESTRUCTOR("t_gnode");
    m_pool_cleanup();
}

void
t_gnode::init() {
    PSP_TRACE_SENTINEL();

    m_gstate = std::make_shared<t_gstate>(m_input_schema, m_output_schema);
    m_gstate->init();

    // Create a single input port
    std::shared_ptr<t_port> port
        = std::make_shared<t_port>(PORT_MODE_PKEYED, m_input_schema);
    port->init();
    m_iports.push_back(port);

    for (t_uindex idx = 0, loop_end = m_transitional_schemas.size(); idx < loop_end; ++idx) {
        t_port_mode mode = idx == 0 ? PORT_MODE_PKEYED : PORT_MODE_RAW;

        std::shared_ptr<t_port> port = std::make_shared<t_port>(mode, m_transitional_schemas[idx]);

        port->init();
        m_oports.push_back(port);
    }

    std::shared_ptr<t_port>& iport = m_iports[0];
    std::shared_ptr<t_data_table> flattened = iport->get_table()->flatten();
    m_init = true;
}

std::string
t_gnode::repr() const {
    std::stringstream ss;
    ss << "t_gnode<" << this << ">";
    return ss.str();
}

void
t_gnode::_send(t_uindex portid, const t_data_table& fragments) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    PSP_VERBOSE_ASSERT(portid == 0, "Only simple dataflows supported currently");

    std::shared_ptr<t_port>& iport = m_iports[portid];
    iport->send(fragments);
}

t_value_transition
t_gnode::calc_transition(
    bool prev_existed,
    bool row_already_exists,
    bool exists,
    bool prev_valid,
    bool cur_valid,
    bool prev_cur_eq,
    bool prev_pkey_eq) {
    t_value_transition trans = VALUE_TRANSITION_EQ_FF;

    if (!row_already_exists && !cur_valid && !t_env::backout_invalid_neq_ft()) {
        trans = VALUE_TRANSITION_NEQ_FT;
    } else if (row_already_exists && !prev_valid && !cur_valid
        && !t_env::backout_eq_invalid_invalid()) {
        trans = VALUE_TRANSITION_EQ_TT;
    } else if (!prev_existed && !exists) {
        trans = VALUE_TRANSITION_EQ_FF;
    } else if (row_already_exists && exists && !prev_valid && cur_valid
        && !t_env::backout_nveq_ft()) {
        trans = VALUE_TRANSITION_NVEQ_FT;
    } else if (prev_existed && exists && prev_cur_eq) {
        trans = VALUE_TRANSITION_EQ_TT;
    } else if (!prev_existed && exists) {
        trans = VALUE_TRANSITION_NEQ_FT;
    } else if (prev_existed && !exists) {
        trans = VALUE_TRANSITION_NEQ_TF;
    } else if (prev_existed && exists && !prev_cur_eq) {
        trans = VALUE_TRANSITION_NEQ_TT;
    } else if (prev_pkey_eq) {
        // prev op must have been a delete
        trans = VALUE_TRANSITION_NEQ_TDT;
    } else {
        PSP_COMPLAIN_AND_ABORT("Hit unexpected condition");
    }
    return trans;
}

t_mask
t_gnode::_process_mask_existed_rows(t_process_state& process_state) {
    // Make sure `existed_data_table` has enough space to write without resizing
    auto flattened_num_rows = process_state.m_flattened_data_table->num_rows();
    process_state.m_existed_data_table->set_size(flattened_num_rows);

    std::shared_ptr<t_column> op_col = 
        process_state.m_flattened_data_table->get_column("psp_op");
    process_state.m_op_base = op_col->get_nth<std::uint8_t>(0);
    t_column* pkey_col = 
        process_state.m_flattened_data_table->get_column("psp_pkey").get();
    
    process_state.m_added_offset.reserve(flattened_num_rows);
    process_state.m_prev_pkey_eq_vec.reserve(flattened_num_rows);

    t_mask mask(flattened_num_rows);
    t_uindex added_count = 0;
    t_tscalar prev_pkey;
    prev_pkey.clear();

    t_column* existed_column = 
        process_state.m_existed_data_table->get_column("psp_existed").get();

    for (t_uindex idx = 0; idx < flattened_num_rows; ++idx) {
        t_tscalar pkey = pkey_col->get_scalar(idx);
        std::uint8_t op_ = process_state.m_op_base[idx];
        t_op op = static_cast<t_op>(op_);

        bool row_already_exists = process_state.m_lookup[idx].m_exists;
        process_state.m_prev_pkey_eq_vec[idx] = pkey == prev_pkey;

        process_state.m_added_offset[idx] = added_count;

        switch (op) {
            case OP_INSERT: {
                row_already_exists = row_already_exists && !process_state.m_prev_pkey_eq_vec[idx];
                mask.set(idx, true);
                existed_column->set_nth(added_count, row_already_exists);
                ++added_count;
            } break;
            case OP_DELETE: {
                if (row_already_exists) {
                    mask.set(idx, true);
                    existed_column->set_nth(added_count, row_already_exists);
                    ++added_count;
                } else {
                    mask.set(idx, false);
                }
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unknown OP"); }
        }

        prev_pkey = pkey;
    }

    PSP_VERBOSE_ASSERT(mask.count() == added_count, "Expected equality");
    return mask;
}

t_process_table_result
t_gnode::_process_table() {
    m_was_updated = false;

    // Create result struct - table is null and should always notify
    // userspace by default.
    t_process_table_result result;
    result.m_flattened_data_table = nullptr;
    result.m_should_notify_userspace = false;

    std::shared_ptr<t_port>& iport = m_iports[0];

    if (iport->get_table()->size() == 0) {
        return result;
    }

    m_was_updated = true;
    std::shared_ptr<t_data_table> flattened(iport->get_table()->flatten());

    PSP_GNODE_VERIFY_TABLE(flattened);
    PSP_GNODE_VERIFY_TABLE(get_table());

    t_uindex flattened_num_rows = flattened->num_rows();

    std::vector<t_rlookup> row_lookup(flattened_num_rows);
    t_column* pkey_col = flattened->get_column("psp_pkey").get();
    
    for (t_uindex idx = 0; idx < flattened_num_rows; ++idx) {
        // See if each primary key in flattened already exist in the dataset
        t_tscalar pkey = pkey_col->get_scalar(idx);
        row_lookup[idx] = m_gstate->lookup(pkey);
    }

    if (m_gstate->mapping_size() == 0) {
        // Update context from state first - computes columns during update
        _update_contexts_from_state(flattened);
        m_gstate->update_master_table(flattened.get());
        m_oports[PSP_PORT_FLATTENED]->set_table(flattened);
        release_inputs();
        release_outputs();

    #ifdef PSP_GNODE_VERIFY
        auto state_table = get_table();
        PSP_GNODE_VERIFY_TABLE(state_table);
    #endif

        // Always notify on initial load
        result.m_should_notify_userspace = true;
        return result;
    }

    for (t_uindex idx = 0, loop_end = m_iports.size(); idx < loop_end; ++idx) {
        m_iports[idx]->release_or_clear();
    }

    // Use `t_process_state` to manage intermediate structures
    t_process_state _process_state;

    _process_state.m_gstate_data_table = get_table_sptr();
    _process_state.m_flattened_data_table = flattened;
    _process_state.m_lookup = row_lookup;

    // Get data tables for process state
    _process_state.m_delta_data_table = m_oports[PSP_PORT_DELTA]->get_table();
    _process_state.m_prev_data_table = m_oports[PSP_PORT_PREV]->get_table();
    _process_state.m_current_data_table = m_oports[PSP_PORT_CURRENT]->get_table();
    _process_state.m_transitions_data_table = m_oports[PSP_PORT_TRANSITIONS]->get_table();
    _process_state.m_existed_data_table = m_oports[PSP_PORT_EXISTED]->get_table();
    _process_state.m_diff_data_table = m_oports[PSP_PORT_DIFF]->get_table();
    
    // Add computed columns to transitions_data_table
    _add_all_computed_columns(
        _process_state.m_transitions_data_table,
        DTYPE_UINT8);

    // And the diff table
    _add_all_computed_columns(
        _process_state.m_diff_data_table,
        DTYPE_BOOL);

    // Recompute values for flattened and m_state->get_table
    _recompute_all_columns(
        get_table_sptr(),
        _process_state.m_flattened_data_table,
        _process_state.m_lookup);

    // Clear delta, prev, current, transitions, existed on EACH call.
    _process_state.clear_transitional_data_tables();

    // compute values on transitional tables before reserve
    _compute_all_columns(
        {
            _process_state.m_delta_data_table,
            _process_state.m_prev_data_table,
            _process_state.m_current_data_table
        });

    // And re-reserved for the amount of data in `flattened`
    _process_state.reserve_transitional_data_tables(flattened_num_rows);

    // Diff table should always only have one row.
    _process_state.m_diff_data_table->reserve(1);

    t_mask existed_mask = _process_mask_existed_rows(_process_state);
    auto mask_count = existed_mask.count();

    // mask_count = flattened_num_rows - number of rows that were removed
    _process_state.set_size_transitional_data_tables(mask_count);

    // With space reserved, set the diff table's size
    _process_state.m_diff_data_table->set_size(1);

    // Reconcile column names - only attempt to process valid computed columns
    std::vector<std::string> column_names = get_output_schema().m_columns;
    std::vector<std::string> valid_computed_columns;
    valid_computed_columns.reserve(
        m_computed_column_map.m_computed_columns.size());

    for (const auto& computed : m_computed_column_map.m_computed_columns) {
        valid_computed_columns.push_back(computed.first);
    }
    
    // Process the `real` columns of the gnode state output schema + the
    // computed columns registered by each context.
    column_names.insert(
        column_names.end(),
        valid_computed_columns.begin(),
        valid_computed_columns.end());

    t_uindex ncols = column_names.size();

#ifdef PSP_PARALLEL_FOR
    tbb::parallel_for(0, int(ncols), 1,
        [&_process_state, &column_names, this](int colidx)
#else
    for (t_uindex colidx = 0; colidx < ncols; ++colidx)
#endif
        {
            const std::string& cname = column_names[colidx];
            auto flattened_column = _process_state.m_flattened_data_table->get_column(cname).get();
            auto gstate_column = _process_state.m_gstate_data_table->get_column(cname).get();
            auto delta_column = _process_state.m_delta_data_table->get_column(cname).get();
            auto prev_column = _process_state.m_prev_data_table->get_column(cname).get();
            auto current_column = _process_state.m_current_data_table->get_column(cname).get();
            auto transitions_column = _process_state.m_transitions_data_table->get_column(cname).get();
            auto diff_column = _process_state.m_diff_data_table->get_column(cname).get();

            t_dtype col_dtype = flattened_column->get_dtype();

            switch (col_dtype) {
                case DTYPE_INT64: {
                    _process_column<std::int64_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_INT32: {
                    _process_column<std::int32_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_INT16: {
                    _process_column<std::int16_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_INT8: {
                    _process_column<std::int8_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_UINT64: {
                    _process_column<std::uint64_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_UINT32: {
                    _process_column<std::uint32_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_UINT16: {
                    _process_column<std::uint16_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_UINT8: {
                    _process_column<std::uint8_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_FLOAT64: {
                    _process_column<double>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_FLOAT32: {
                    _process_column<float>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_BOOL: {
                    _process_column<std::uint8_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_TIME: {
                    _process_column<std::int64_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_DATE: {
                    _process_column<std::uint32_t>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                case DTYPE_STR: {
                    _process_column<std::string>(flattened_column, gstate_column, delta_column, prev_column, current_column, transitions_column, diff_column, _process_state);
                } break;
                default: { PSP_COMPLAIN_AND_ABORT("Unsupported column dtype"); }
            }
        }
#ifdef PSP_PARALLEL_FOR
    );
#endif
    // After transitional tables are written, compute their values
    _compute_all_columns(
        {
            _process_state.m_delta_data_table,
            _process_state.m_prev_data_table,
            _process_state.m_current_data_table
        });

    /**
     * After all columns have been processed (transitional tables written into),
     * `_process_state.m_flattened_data_table` contains the accumulated state
     * of the dataset that updates the master table on `m_gstate`, including
     * added rows, updated in-place rows, and rows to be removed.
     * 
     * `existed_mask` is a bitset marked true for `OP_INSERT`, and false for
     * `OP_DELETE`. If there are any `OP_DELETE`s, the next step returns a
     * new `t_data_table` with the deleted rows masked out.
     */
    std::shared_ptr<t_data_table> flattened_masked;

    if (existed_mask.count() == _process_state.m_flattened_data_table->size()) {
        flattened_masked = _process_state.m_flattened_data_table;
    } else {
        flattened_masked = 
            _process_state.m_flattened_data_table->clone(existed_mask);
    }

    PSP_GNODE_VERIFY_TABLE(flattened_masked);

    #ifdef PSP_GNODE_VERIFY
    {
        auto updated_table = get_table();
        PSP_GNODE_VERIFY_TABLE(updated_table);
    }
    #endif

    m_gstate->update_master_table(flattened_masked.get());

    #ifdef PSP_GNODE_VERIFY
    {
        auto updated_table = get_table();
        PSP_GNODE_VERIFY_TABLE(updated_table);
    }
    #endif

    m_oports[PSP_PORT_FLATTENED]->set_table(flattened_masked);

    // Read the diff data table - if all columns have no new values, then
    // don't notify userspace.
    bool should_notify_userspace = false;

    for (t_uindex colidx = 0; colidx < ncols; ++colidx) {
        const std::string& cname = column_names[colidx];
        auto diff_column = _process_state.m_diff_data_table->get_column(cname).get();
        bool column_should_notify = diff_column->get_nth<bool>(0);

        if (column_should_notify && !should_notify_userspace) {
            // Once `should_notify_userspace` is true, it cannot be set back
            // to false.
            should_notify_userspace = column_should_notify;
        }
    }

    result.m_flattened_data_table = flattened_masked;
    result.m_should_notify_userspace = should_notify_userspace;

    std::cout << "should notify: " << std::boolalpha << result.m_should_notify_userspace << std::endl;

    return result;
}

template <>
void
t_gnode::_process_column<std::string>(
    const t_column* flattened_column,
    const t_column* gstate_column,
    t_column* delta_column,
    t_column* prev_column,
    t_column* current_column,
    t_column* transitions_column,
    t_column* diff_column,
    const t_process_state& process_state) {
    prev_column->borrow_vocabulary(*gstate_column);

    bool should_notify_userspace = false;

    for (t_uindex idx = 0, loop_end = flattened_column->size(); idx < loop_end; ++idx) {
        std::uint8_t op_ = process_state.m_op_base[idx];
        t_op op = static_cast<t_op>(op_);
        t_uindex added_count = process_state.m_added_offset[idx];

        const t_rlookup& rlookup = process_state.m_lookup[idx];
        bool row_already_exists = rlookup.m_exists;
        auto prev_pkey_eq = process_state.m_prev_pkey_eq_vec[idx];

        switch (op) {
            case OP_INSERT: {
                row_already_exists = row_already_exists && !prev_pkey_eq;

                const char* prev_value = 0;
                bool prev_valid = false;

                auto current_value = flattened_column->get_nth<const char>(idx);
                std::string current_value_string(current_value);

                bool current_value_is_valid = flattened_column->is_valid(idx);

                if (row_already_exists) {
                    // If the cell already exists, i.e. an indexed update,
                    // Look up the value in the cell and the cell's
                    // validity.
                    prev_value = gstate_column->get_nth<const char>(rlookup.m_idx);
                    prev_valid = gstate_column->is_valid(rlookup.m_idx);
                }

                bool exists = current_value_is_valid;
                bool prev_existed = row_already_exists && prev_valid;

                // Whether the previous and the current value are equal. If
                // the values are equal, the cell is not updated. If all values
                // in an update (across all columns and rows) are equal to
                // their previous values, an update is considered a no-op
                // and `on_update` callbacks will not fire.
                bool prev_cur_eq
                    = prev_value && current_value && strcmp(prev_value, current_value) == 0;

                if (prev_existed && exists) {
                    // strcmp returns 0 (no difference) when both values are
                    // empty strings, so we need to manually set eq to true.
                    // Use current value as `std::string`, as it might be null and
                    // calling `strlen` will segfault. 
                    if (strlen(prev_value) == 0 && current_value_string.size() == 0) {
                        prev_cur_eq = true;
                    }
                }

                // If at any point, the previous and current values are not
                // equal, set `m_has_new_values` to true to make sure that
                // `on_update` callbacks are triggered. Once `m_has_new_values`
                // is true, it cannot be set to false.
                if (!prev_cur_eq && !should_notify_userspace) {
                    //std::cout << "`" << prev_value << "`, `" << current_value_string << std::boolalpha << "`, " << strcmp(prev_value, current_value) << ", " << prev_cur_eq << std::endl;
                    should_notify_userspace = true;
                }

                auto trans = calc_transition(prev_existed, row_already_exists, exists, prev_valid,
                    current_value_is_valid, prev_cur_eq, prev_pkey_eq);

                if (prev_valid) {
                    prev_column->set_nth<t_uindex>(
                        added_count, *(gstate_column->get_nth<t_uindex>(rlookup.m_idx)));
                }

                prev_column->set_valid(added_count, prev_valid);

                if (current_value_is_valid) {
                    current_column->set_nth<const char*>(added_count, current_value);
                }

                if (!current_value_is_valid && prev_valid) {
                    current_column->set_nth<const char*>(added_count, prev_value);
                }

                current_column->set_valid(added_count, current_value_is_valid ? current_value_is_valid : prev_valid);

                transitions_column->set_nth<std::uint8_t>(idx, trans);
            } break;
            case OP_DELETE: {
                if (row_already_exists) {
                    auto prev_value = gstate_column->get_nth<const char>(rlookup.m_idx);

                    bool prev_valid = gstate_column->is_valid(rlookup.m_idx);

                    prev_column->set_nth<const char*>(added_count, prev_value);

                    prev_column->set_valid(added_count, prev_valid);

                    current_column->set_nth<const char*>(added_count, prev_value);

                    current_column->set_valid(added_count, prev_valid);

                    transitions_column->set_nth<std::uint8_t>(added_count, VALUE_TRANSITION_NEQ_TDF);
                }
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unknown OP"); }
        }
    }

    diff_column->set_nth<bool>(0, should_notify_userspace);
}

bool
t_gnode::_process() {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    PSP_VERBOSE_ASSERT(
        m_mode == NODE_PROCESSING_SIMPLE_DATAFLOW, "Only simple dataflows supported currently");
    psp_log_time(repr() + " _process.enter");

    t_process_table_result process_result = _process_table();
    std::shared_ptr<t_data_table> flattened_masked = process_result.m_flattened_data_table;
    if (flattened_masked) {
        notify_contexts(*flattened_masked);
    }

    psp_log_time(repr() + " _process.noinit_path.exit");
    return process_result.m_should_notify_userspace;
}

t_uindex
t_gnode::mapping_size() const {
    return m_gstate->mapping_size();
}

t_data_table*
t_gnode::_get_otable(t_uindex portidx) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    PSP_VERBOSE_ASSERT(portidx < m_oports.size(), "Invalid port number");
    return m_oports[portidx]->get_table().get();
}

t_data_table*
t_gnode::_get_itable(t_uindex portidx) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    PSP_VERBOSE_ASSERT(portidx < m_iports.size(), "Invalid port number");
    return m_iports[portidx]->get_table().get();
}

t_data_table*
t_gnode::get_table() {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    return m_gstate->get_table().get();
}

const t_data_table*
t_gnode::get_table() const {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    return m_gstate->get_table().get();
}

std::shared_ptr<t_data_table>
t_gnode::get_table_sptr() {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    return m_gstate->get_table();
}

/**
 * Convenience method for promoting a column.  This is a hack used to
 * interop with javascript more efficiently, and does not handle all
 * possible type conversions.  Non-public.
 */
void
t_gnode::promote_column(const std::string& name, t_dtype new_type) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    get_table()->promote_column(name, new_type, 0, false);
    _get_otable(0)->promote_column(name, new_type, 0, false);
    _get_itable(0)->promote_column(name, new_type, 0, false);
    m_output_schema.retype_column(name, new_type);
    m_input_schema.retype_column(name, new_type);
    m_transitional_schemas[0].retype_column(name, new_type);
}

void
t_gnode::pprint() const {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    m_gstate->pprint();
}

template <typename CTX_T>
void
t_gnode::set_ctx_state(void* ptr) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    CTX_T* ctx = static_cast<CTX_T*>(ptr);
    ctx->set_state(m_gstate);
}

void
t_gnode::_update_contexts_from_state(std::shared_ptr<t_data_table> tbl) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");

    for (auto& kv : m_contexts) {
        auto& ctxh = kv.second;
        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                auto ctx = static_cast<t_ctx2*>(ctxh.m_ctx);
                ctx->reset();
                update_context_from_state<t_ctx2>(ctx, tbl);
            } break;
            case ONE_SIDED_CONTEXT: {
                auto ctx = static_cast<t_ctx1*>(ctxh.m_ctx);
                ctx->reset();
                update_context_from_state<t_ctx1>(ctx, tbl);
            } break;
            case ZERO_SIDED_CONTEXT: {
                auto ctx = static_cast<t_ctx0*>(ctxh.m_ctx);
                ctx->reset();
                update_context_from_state<t_ctx0>(ctx, tbl);
            } break;
            case GROUPED_PKEY_CONTEXT: {
                auto ctx = static_cast<t_ctx_grouped_pkey*>(ctxh.m_ctx);
                ctx->reset();
                update_context_from_state<t_ctx_grouped_pkey>(ctx, tbl);
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    }
}

std::vector<std::string>
t_gnode::get_registered_contexts() const {
    std::vector<std::string> rval;

    for (const auto& kv : m_contexts) {
        std::stringstream ss;
        const auto& ctxh = kv.second;
        ss << "(ctx_name => " << kv.first << ", ";

        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                auto ctx = static_cast<const t_ctx2*>(ctxh.m_ctx);
                ss << ctx->repr() << ")";
            } break;
            case ONE_SIDED_CONTEXT: {
                auto ctx = static_cast<const t_ctx1*>(ctxh.m_ctx);
                ss << ctx->repr() << ")";
            } break;
            case ZERO_SIDED_CONTEXT: {
                auto ctx = static_cast<const t_ctx0*>(ctxh.m_ctx);
                ss << ctx->repr() << ")";
            } break;
            case GROUPED_PKEY_CONTEXT: {
                auto ctx = static_cast<const t_ctx_grouped_pkey*>(ctxh.m_ctx);
                ss << ctx->repr() << ")";
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }

        rval.push_back(ss.str());
    }

    return rval;
}

void
t_gnode::_register_context(const std::string& name, t_ctx_type type, std::int64_t ptr) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    void* ptr_ = reinterpret_cast<void*>(ptr);
    t_ctx_handle ch(ptr_, type);
    m_contexts[name] = ch;

    bool should_update = m_gstate->mapping_size() > 0;

    // TODO: shift columns forward in cleanup, translate dead indices
    std::shared_ptr<t_data_table> flattened;

    if (should_update) {
        flattened = m_gstate->get_pkeyed_table();
    }

    std::vector<t_computed_column_definition> computed_columns;

    switch (type) {
        case TWO_SIDED_CONTEXT: {
            set_ctx_state<t_ctx2>(ptr_);
            t_ctx2* ctx = static_cast<t_ctx2*>(ptr_);
            ctx->reset();
            computed_columns = ctx->get_config().get_computed_columns();
            m_computed_column_map.add_computed_columns(computed_columns);
            if (should_update)
                update_context_from_state<t_ctx2>(ctx, flattened);
        } break;
        case ONE_SIDED_CONTEXT: {
            set_ctx_state<t_ctx1>(ptr_);
            t_ctx1* ctx = static_cast<t_ctx1*>(ptr_);
            ctx->reset();
            computed_columns = ctx->get_config().get_computed_columns();
            m_computed_column_map.add_computed_columns(computed_columns);
            if (should_update)
                update_context_from_state<t_ctx1>(ctx, flattened);
        } break;
        case ZERO_SIDED_CONTEXT: {
            set_ctx_state<t_ctx0>(ptr_);
            t_ctx0* ctx = static_cast<t_ctx0*>(ptr_);
            ctx->reset();
            computed_columns = ctx->get_config().get_computed_columns();
            m_computed_column_map.add_computed_columns(computed_columns);
            if (should_update)
                update_context_from_state<t_ctx0>(ctx, flattened);
        } break;
        case GROUPED_PKEY_CONTEXT: {
            set_ctx_state<t_ctx0>(ptr_);
            auto ctx = static_cast<t_ctx_grouped_pkey*>(ptr_);
            ctx->reset();
            computed_columns = ctx->get_config().get_computed_columns();
            m_computed_column_map.add_computed_columns(computed_columns);
            if (should_update)
                update_context_from_state<t_ctx_grouped_pkey>(ctx, flattened);
        } break;
        default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
    }

    // When a context is registered, compute its columns on the master table
    // so the columns will exist when updates, etc. are processed.
    std::shared_ptr<t_data_table> gstate_table = get_table_sptr();
    for (const auto& computed : computed_columns) {
        _add_computed_column(computed, gstate_table);
    }
}

void
t_gnode::_unregister_context(const std::string& name) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    auto it = m_contexts.find(name);
    if (it == m_contexts.end()) return;

    // remove computed columns from gnode state
    t_ctx_handle ctxh = it->second;
    t_ctx_type type = ctxh.get_type();

    std::vector<std::string> computed_column_names;
    switch (type) {
        case TWO_SIDED_CONTEXT: {
            t_ctx2* ctx = static_cast<t_ctx2*>(ctxh.m_ctx);
            auto computed_columns = ctx->get_config().get_computed_columns();
            computed_column_names.reserve(computed_columns.size());
            for (const auto& c : computed_columns) {
                computed_column_names.push_back(std::get<0>(c));
            }
            m_computed_column_map.remove_computed_columns(computed_column_names);
        } break;
        case ONE_SIDED_CONTEXT: {
            t_ctx1* ctx = static_cast<t_ctx1*>(ctxh.m_ctx);
            auto computed_columns = ctx->get_config().get_computed_columns();
            computed_column_names.reserve(computed_columns.size());
            for (const auto& c : computed_columns) {
                computed_column_names.push_back(std::get<0>(c));
            }
            m_computed_column_map.remove_computed_columns(computed_column_names);
        } break;
        case ZERO_SIDED_CONTEXT: {
            t_ctx0* ctx = static_cast<t_ctx0*>(ctxh.m_ctx);
            auto computed_columns = ctx->get_config().get_computed_columns();
            computed_column_names.reserve(computed_columns.size());
            for (const auto& c : computed_columns) {
                computed_column_names.push_back(std::get<0>(c));
            }
            m_computed_column_map.remove_computed_columns(computed_column_names);
        } break;
        case GROUPED_PKEY_CONTEXT: {
            auto ctx = static_cast<t_ctx_grouped_pkey*>(ctxh.m_ctx);
            auto computed_columns = ctx->get_config().get_computed_columns();
            computed_column_names.reserve(computed_columns.size());
            for (const auto& c : computed_columns) {
                computed_column_names.push_back(std::get<0>(c));
            }
            m_computed_column_map.remove_computed_columns(computed_column_names);
        } break;
        default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
    }

    PSP_VERBOSE_ASSERT(it != m_contexts.end(), "Context not found.");

    m_contexts.erase(name);
}

void
t_gnode::notify_contexts(const t_data_table& flattened) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    psp_log_time(repr() + "notify_contexts.enter");
    t_index num_ctx = m_contexts.size();
    std::vector<t_ctx_handle> ctxhvec(num_ctx);

    t_index ctxh_count = 0;
    for (std::map<std::string, t_ctx_handle>::const_iterator iter = m_contexts.begin(); iter != m_contexts.end();
         ++iter) {
        ctxhvec[ctxh_count] = iter->second;
        ctxh_count++;
    }

    auto notify_context_helper = [this, &ctxhvec, &flattened](t_index ctxidx) {
        const t_ctx_handle& ctxh = ctxhvec[ctxidx];
        switch (ctxh.get_type()) {
            case TWO_SIDED_CONTEXT: {
                notify_context<t_ctx2>(flattened, ctxh);
            } break;
            case ONE_SIDED_CONTEXT: {
                notify_context<t_ctx1>(flattened, ctxh);
            } break;
            case ZERO_SIDED_CONTEXT: {
                notify_context<t_ctx0>(flattened, ctxh);
            } break;
            case GROUPED_PKEY_CONTEXT: {
                notify_context<t_ctx_grouped_pkey>(flattened, ctxh);
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    };

    #ifdef PSP_PARALLEL_FOR
    tbb::parallel_for(0, int(num_ctx), 1,
        [&notify_context_helper](int ctxidx)
    #else
    for (t_index ctxidx = 0; ctxidx < num_ctx; ++ctxidx)
    #endif
        { notify_context_helper(ctxidx); }
    #ifdef PSP_PARALLEL_FOR
        );
    #endif

    psp_log_time(repr() + "notify_contexts.exit");
}

/******************************************************************************
 *
 * Computed Column Operations
 */

void
t_gnode::_recompute_all_columns(
    std::shared_ptr<t_data_table> tbl,
    std::shared_ptr<t_data_table> flattened,
    const std::vector<t_rlookup>& changed_rows) {
    const auto& computed_columns = m_computed_column_map.m_computed_columns;
    for (const auto& computed : computed_columns) {
        _recompute_column(computed.second, tbl, flattened, changed_rows);
    }
}

void
t_gnode::_compute_all_columns(
    std::vector<std::shared_ptr<t_data_table>> tables) {
    const auto& computed_columns = m_computed_column_map.m_computed_columns;
    for (std::shared_ptr<t_data_table> table : tables) {
        for (const auto& computed : computed_columns) {
            _compute_column(computed.second, table);
        }
    }
}

void
t_gnode::_add_all_computed_columns(
    std::shared_ptr<t_data_table> table, t_dtype dtype) {
    std::vector<std::string> computed_column_names;
    computed_column_names.reserve(
        m_computed_column_map.m_computed_columns.size());

    for (const auto& computed : m_computed_column_map.m_computed_columns) {
        computed_column_names.push_back(computed.first);
    }

    for (const std::string& name : computed_column_names) {
       table->add_column(name, dtype, true);
    }
}

void
t_gnode::_add_computed_column(
    const t_computed_column_definition& computed_column,
    std::shared_ptr<t_data_table> tbl) {
    std::string computed_column_name = std::get<0>(computed_column);
    std::vector<std::string> input_column_names = std::get<2>(computed_column);
    t_computation computation = std::get<3>(computed_column);

    if (computation.m_name == INVALID_COMPUTED_FUNCTION) {
        std::cerr 
            << "Cannot add computed column `"
            << computed_column_name
            << "` in gnode."
            << std::endl;
            return;
    }

    t_dtype output_column_type = computation.m_return_type;

    tbl->add_column_sptr(
        computed_column_name, output_column_type, true);
}

void
t_gnode::_compute_column(
    const t_computed_column_definition& computed_column,
    std::shared_ptr<t_data_table> tbl) {
        std::vector<t_dtype> input_types;
    std::vector<std::shared_ptr<t_column>> input_columns;

    std::string computed_column_name = std::get<0>(computed_column);
    std::vector<std::string> input_column_names = std::get<2>(computed_column);
    t_computation computation = std::get<3>(computed_column);
    
    for (const auto& name : input_column_names) {
        auto column = tbl->get_column(name);
        input_columns.push_back(column);
    }

    if (computation.m_name == INVALID_COMPUTED_FUNCTION) {
        std::cerr 
            << "Cannot compute column `"
            << computed_column_name
            << "` in gnode."
            << std::endl;
            return;
    }

    t_dtype output_column_type = computation.m_return_type;

    auto output_column = tbl->add_column_sptr(
        computed_column_name, output_column_type, true);

    output_column->reserve(input_columns[0]->size());

    t_computed_column::apply_computation(
        input_columns,
        output_column,
        computation);
}

void
t_gnode::_recompute_column(
    const t_computed_column_definition& computed_column,
    std::shared_ptr<t_data_table> table,
    std::shared_ptr<t_data_table> flattened,
    const std::vector<t_rlookup>& changed_rows) {
    std::vector<t_dtype> input_types;
    std::vector<std::shared_ptr<t_column>> table_columns;
    std::vector<std::shared_ptr<t_column>> flattened_columns;

    std::string computed_column_name = std::get<0>(computed_column);
    std::vector<std::string> input_column_names = std::get<2>(computed_column);
    t_computation computation = std::get<3>(computed_column);

    if (computation.m_name == INVALID_COMPUTED_FUNCTION) {
    std::cerr 
        << "Cannot re-compute column `"
        << computed_column_name
        << "` in gnode."
        << std::endl;
        return;
    }
    
    for (const auto& name : input_column_names) {
        auto table_column = table->get_column(name);
        auto flattened_column = flattened->get_column(name);
        table_columns.push_back(table_column);
        flattened_columns.push_back(flattened_column);
    }

    t_dtype output_column_type = computation.m_return_type;
    
    // FIXME: computed columns created with dependencies don't seem to work

    auto output_column = flattened->add_column_sptr(
        computed_column_name, output_column_type, true);
    output_column->reserve(table_columns[0]->size());

    t_computed_column::reapply_computation(
        table_columns,
        flattened_columns,
        changed_rows,
        output_column,
        computation);
}

std::vector<t_pivot>
t_gnode::get_pivots() const {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");

    std::vector<t_pivot> rval;

    for (std::map<std::string, t_ctx_handle>::const_iterator iter = m_contexts.begin(); iter != m_contexts.end();
         ++iter) {
        auto ctxh = iter->second;

        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                const t_ctx2* ctx = static_cast<const t_ctx2*>(ctxh.m_ctx);
                auto pivots = ctx->get_pivots();
                rval.insert(std::end(rval), std::begin(pivots), std::end(pivots));
            } break;
            case ONE_SIDED_CONTEXT: {
                const t_ctx1* ctx = static_cast<const t_ctx1*>(ctxh.m_ctx);
                auto pivots = ctx->get_pivots();
                rval.insert(std::end(rval), std::begin(pivots), std::end(pivots));
            } break;
            case ZERO_SIDED_CONTEXT:
            case GROUPED_PKEY_CONTEXT: {
                // no pivots
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    }

    return rval;
}

t_schema
t_gnode::get_output_schema() const {
    return m_output_schema;
}

std::vector<t_stree*>
t_gnode::get_trees() {

    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");

    std::vector<t_stree*> rval;

    for (const auto& kv : m_contexts) {
        auto& ctxh = kv.second;

        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx2*>(ctxh.m_ctx);
                auto trees = ctx->get_trees();
                rval.insert(rval.end(), std::begin(trees), std::end(trees));
            } break;
            case ONE_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx1*>(ctxh.m_ctx);
                auto trees = ctx->get_trees();
                rval.insert(rval.end(), std::begin(trees), std::end(trees));
            } break;
            case ZERO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx0*>(ctxh.m_ctx);
                auto trees = ctx->get_trees();
                rval.insert(rval.end(), std::begin(trees), std::end(trees));
            } break;
            case GROUPED_PKEY_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx_grouped_pkey*>(ctxh.m_ctx);
                auto trees = ctx->get_trees();
                rval.insert(rval.end(), std::begin(trees), std::end(trees));
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    }
    return rval;
}

void
t_gnode::set_id(t_uindex id) {
    m_id = id;
}

t_uindex
t_gnode::get_id() const {
    return m_id;
}

void
t_gnode::release_inputs() {
    for (const auto& p : m_iports) {
        p->release();
    }
}

void
t_gnode::release_outputs() {
    for (const auto& p : m_oports) {
        p->release();
    }
}

std::vector<std::string>
t_gnode::get_contexts_last_updated() const {
    std::vector<std::string> rval;

    for (const auto& kv : m_contexts) {
        auto ctxh = kv.second;
        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx2*>(ctxh.m_ctx);
                if (ctx->has_deltas()) {
                    rval.push_back(kv.first);
                }
            } break;
            case ONE_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx1*>(ctxh.m_ctx);
                if (ctx->has_deltas()) {
                    rval.push_back(kv.first);
                }
            } break;
            case ZERO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx0*>(ctxh.m_ctx);
                if (ctx->has_deltas()) {
                    rval.push_back(kv.first);
                }
            } break;
            case GROUPED_PKEY_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx_grouped_pkey*>(ctxh.m_ctx);
                if (ctx->has_deltas()) {
                    rval.push_back(kv.first);
                }
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    }

    if (t_env::log_progress()) {
        std::cout << "get_contexts_last_updated<" << std::endl;
        for (const auto& s : rval) {
            std::cout << "\t" << s << std::endl;
        }
        std::cout << ">\n";
    }
    return rval;
}

std::vector<t_tscalar>
t_gnode::get_row_data_pkeys(const std::vector<t_tscalar>& pkeys) const {
    return m_gstate->get_row_data_pkeys(pkeys);
}

void
t_gnode::reset() {
    std::vector<std::string> rval;

    for (const auto& kv : m_contexts) {
        auto ctxh = kv.second;
        switch (ctxh.m_ctx_type) {
            case TWO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx2*>(ctxh.m_ctx);
                ctx->reset();
            } break;
            case ONE_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx1*>(ctxh.m_ctx);
                ctx->reset();
            } break;
            case ZERO_SIDED_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx0*>(ctxh.m_ctx);
                ctx->reset();
            } break;
            case GROUPED_PKEY_CONTEXT: {
                auto ctx = reinterpret_cast<t_ctx_grouped_pkey*>(ctxh.m_ctx);
                ctx->reset();
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unexpected context type"); } break;
        }
    }

    m_gstate->reset();
}

void
t_gnode::clear_input_ports() {
    for (t_uindex idx = 0, loop_end = m_oports.size(); idx < loop_end; ++idx) {
        m_iports[idx]->get_table()->clear();
    }
}

void
t_gnode::clear_output_ports() {
    for (t_uindex idx = 0, loop_end = m_oports.size(); idx < loop_end; ++idx) {
        m_oports[idx]->get_table()->clear();
    }
}

t_data_table*
t_gnode::_get_pkeyed_table() const {
    return m_gstate->_get_pkeyed_table();
}

std::shared_ptr<t_data_table>
t_gnode::get_pkeyed_table_sptr() const {
    return m_gstate->get_pkeyed_table();
}

std::vector<t_custom_column>
t_gnode::get_custom_columns() const {
    return m_custom_columns;
}

void
t_gnode::set_pool_cleanup(std::function<void()> cleanup) {
    m_pool_cleanup = cleanup;
}

const t_schema&
t_gnode::get_state_input_schema() const {
    return m_gstate->get_input_schema();
}

bool
t_gnode::was_updated() const {
    return m_was_updated;
}

void
t_gnode::clear_updated() {
    m_was_updated = false;
}

std::shared_ptr<t_data_table>
t_gnode::get_sorted_pkeyed_table() const {
    return m_gstate->get_sorted_pkeyed_table();
}

void
t_gnode::register_context(const std::string& name, std::shared_ptr<t_ctx0> ctx) {
    _register_context(name, ZERO_SIDED_CONTEXT, reinterpret_cast<std::int64_t>(ctx.get()));
}

void
t_gnode::register_context(const std::string& name, std::shared_ptr<t_ctx1> ctx) {
    _register_context(name, ONE_SIDED_CONTEXT, reinterpret_cast<std::int64_t>(ctx.get()));
}

void
t_gnode::register_context(const std::string& name, std::shared_ptr<t_ctx2> ctx) {
    _register_context(name, TWO_SIDED_CONTEXT, reinterpret_cast<std::int64_t>(ctx.get()));
}
void
t_gnode::register_context(const std::string& name, std::shared_ptr<t_ctx_grouped_pkey> ctx) {
    _register_context(name, GROUPED_PKEY_CONTEXT, reinterpret_cast<std::int64_t>(ctx.get()));
}

} // end namespace perspective
