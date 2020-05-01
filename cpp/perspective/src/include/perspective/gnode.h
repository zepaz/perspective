/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

#pragma once
#include <perspective/first.h>
#include <perspective/base.h>
#include <perspective/port.h>
#include <perspective/schema.h>
#include <perspective/exports.h>
#include <perspective/context_handle.h>
#include <perspective/pivot.h>
#include <perspective/env_vars.h>
#include <perspective/custom_column.h>
#include <perspective/rlookup.h>
#include <perspective/gnode_state.h>
#include <perspective/sparse_tree.h>
#include <perspective/process_state.h>
#include <perspective/computed.h>
#include <perspective/computed_column_map.h>
#include <perspective/computed_function.h>
#ifdef PSP_PARALLEL_FOR
#include <tbb/parallel_sort.h>
#include <tbb/tbb.h>
#endif
#include <chrono>

namespace perspective {

PERSPECTIVE_EXPORT t_tscalar calc_delta(
    t_value_transition trans, t_tscalar oval, t_tscalar nval);

PERSPECTIVE_EXPORT t_tscalar calc_newer(
    t_value_transition trans, t_tscalar oval, t_tscalar nval);

PERSPECTIVE_EXPORT t_tscalar calc_negate(t_tscalar val);

class t_ctx0;
class t_ctx1;
class t_ctx2;
class t_ctx_grouped_pkey;

#ifdef PSP_GNODE_VERIFY
#define PSP_GNODE_VERIFY_TABLE(X) (X)->verify()
#else
#define PSP_GNODE_VERIFY_TABLE(X)
#endif

/**
 * @brief The struct returned from `_process_table`, which contains a
 * pointer to the flattened and processed `t_data_table`, and a boolean showing
 * whether the user's `on_update` callbacks should be called, i.e. whether the 
 * update contained new data or not.
 * 
 * Given that `_process_table` may be called multiple times, as is `_process`,
 * `t_update_task` will accumulate the values of `m_should_notify_userspace`
 * over multiple calls and only consider an update a no-op if all values of
 * `m_should_notify_userspace` are false.
 */
struct PERSPECTIVE_EXPORT t_process_table_result {
    std::shared_ptr<t_data_table> m_flattened_data_table;
    bool m_should_notify_userspace;
};

class PERSPECTIVE_EXPORT t_gnode {
public:
    /**
     * @brief Construct a new `t_gnode`. A `t_gnode` manages the accumulated
     * internal state of a `Table` - it handles updates, calculates the
     * transition state between each `update()` call, and manages/notifies
     * contexts (`View`s) created from the `Table`.
     * 
     * A `t_gnode` is created with two `t_schema`s:
     * 
     * `input_schema`: the canonical `t_schema` for the `Table`, which cannot
     * be mutated after creation. This schema contains the `psp_pkey` and
     * `psp_op` columns, which are used internally.
     * 
     * `output_schema`: the `t_schema` that contains all columns provided
     * by the dataset, excluding `psp_pkey` and `psp_op`.
     * 
     * @param input_schema 
     * @param output_schema 
     */
    t_gnode(const t_schema& input_schema, const t_schema& output_schema);
    ~t_gnode();

    void init();
    void reset();

    // send data to input port with at index idx
    // schema should match port schema
    void _send(t_uindex idx, const t_data_table& fragments);
    
    /**
     * @brief Process all the updates queued up in this gnode instance. Returns
     * a boolean that is false if NONE of the updates contain new values that
     * are not already in the Table, and true otherwise. If returning false,
     * the user's `on_update` callbacks will not be notified of the update.
     * 
     * @return true 
     * @return false 
     */
    bool _process();

    void _register_context(const std::string& name, t_ctx_type type, std::int64_t ptr);
    void _unregister_context(const std::string& name);

    const t_data_table* get_table() const;
    t_data_table* get_table();

    std::shared_ptr<t_data_table> get_table_sptr();

    t_data_table* _get_otable(t_uindex portidx);
    t_data_table* _get_itable(t_uindex portidx);

    t_schema get_output_schema() const;
    const t_schema& get_state_input_schema() const;

    std::vector<t_pivot> get_pivots() const;
    std::vector<t_stree*> get_trees();

    void set_id(t_uindex id);
    t_uindex get_id() const;

    void release_inputs();
    void release_outputs();
    std::vector<std::string> get_registered_contexts() const;
    std::vector<std::string> get_contexts_last_updated() const;

    void clear_input_ports();
    void clear_output_ports();

    t_data_table* _get_pkeyed_table() const;
    std::shared_ptr<t_data_table> get_pkeyed_table_sptr() const;
    std::shared_ptr<t_data_table> get_sorted_pkeyed_table() const;

    bool has_pkey(t_tscalar pkey) const;

    std::vector<t_tscalar> get_row_data_pkeys(const std::vector<t_tscalar>& pkeys) const;
    std::vector<t_tscalar> has_pkeys(const std::vector<t_tscalar>& pkeys) const;
    std::vector<t_tscalar> get_pkeys() const;

    std::vector<t_custom_column> get_custom_columns() const;

    void set_pool_cleanup(std::function<void()> cleanup);
    bool was_updated() const;
    void clear_updated();

    t_uindex mapping_size() const;

    // helper function for JS interface
    void promote_column(const std::string& name, t_dtype new_type);

    // Gnode will steal a reference to the context
    void register_context(const std::string& name, std::shared_ptr<t_ctx0> ctx);
    void register_context(const std::string& name, std::shared_ptr<t_ctx1> ctx);
    void register_context(const std::string& name, std::shared_ptr<t_ctx2> ctx);
    void register_context(const std::string& name, std::shared_ptr<t_ctx_grouped_pkey> ctx);

    void pprint() const;
    std::string repr() const;

protected:
    /**
     * @brief Given `tbl`, notify each registered context with `tbl`.
     * 
     * @param tbl 
     */
    void _update_contexts_from_state(std::shared_ptr<t_data_table> tbl);

    /**
     * @brief Notify a single registered `ctx` with `tbl`.
     * 
     * @tparam CTX_T 
     * @param ctx 
     * @param tbl 
     * @param flattened 
     * @param delta 
     * @param prev 
     * @param current 
     * @param transitions 
     * @param changed_rows 
     */
    template <typename CTX_T>
    void update_context_from_state(CTX_T* ctx, std::shared_ptr<t_data_table> tbl);

    /**
     * @brief Provide the registered `t_ctx*` with a pointer to this gnode's
     * `m_gstate` object. `t_ctx*` are assumed to access/mutate this state
     * object arbitrarily at runtime.
     * 
     * @tparam CTX_T 
     * @param ptr 
     */
    template <typename CTX_T>
    void set_ctx_state(void* ptr);

    bool have_context(const std::string& name) const;
    void notify_contexts(const t_data_table& flattened);

    template <typename CTX_T>
    void notify_context(const t_data_table& flattened, const t_ctx_handle& ctxh);

    template <typename CTX_T>
    void notify_context(CTX_T* ctx, const t_data_table& flattened, const t_data_table& delta,
        const t_data_table& prev, const t_data_table& current, const t_data_table& transitions,
        const t_data_table& existed);

    /**
     * @brief Given the process state, create a `t_mask` bitset set to true for
     * all rows in `flattened`, UNLESS the row is an `OP_DELETE`.
     * 
     * Mutates the `t_process_state` object that is passed in.
     * 
     * @param process_state
     */
    t_mask _process_mask_existed_rows(t_process_state& process_state);

    /**
     * @brief Given a flattened column, the master column from `m_gstate`, and
     * all transitional columns containing metadata, process and calculate
     * transitional values.
     * 
     * @tparam DATA_T 
     * @param flattened_column the column from the flattened data table, i.e.
     * the data with which to update the master table.
     * @param gstate_column the column from the master data table on `m_gstate`.
     * @param delta_column the column containing deltas for each value.
     * @param prev_column 
     * @param current_column 
     * @param transitions_column
     * @param diff_column
     * @param process_state 
     */
    template <typename T>
    void _process_column(
        const t_column* flattened_column,
        const t_column* gstate_column,
        t_column* delta_column,
        t_column* prev_column,
        t_column* current_column,
        t_column* transitions_column,
        t_column* diff_column,
        const t_process_state& process_state);

    /**
     * @brief Calculate the transition state for a single cell, which depends
     * on whether the cell is/was valid, existed, or is new.
     * 
     * @param prev_existed 
     * @param row_already_exists 
     * @param exists 
     * @param prev_valid 
     * @param cur_valid 
     * @param prev_cur_eq 
     * @param prev_pkey_eq 
     * @return t_value_transition 
     */
    t_value_transition calc_transition(bool prev_existed, bool row_already_exists, bool exists,
        bool prev_valid, bool cur_valid, bool prev_cur_eq, bool prev_pkey_eq);

    /**
     * @brief For all valid computed columns registered with the gnode,
     * the master `m_table` of `m_state`.
     * 
     * @param tbl 
     * @param flattened 
     * @param changed_rows 
     */
    void
    _recompute_all_columns(
        std::shared_ptr<t_data_table> tbl,
        std::shared_ptr<t_data_table> flattened,
        const std::vector<t_rlookup>& changed_rows);

    /**
     * @brief For each `t_data_table` in tables, apply computations for each
     * computed column registered with the gnode.
     * 
     * @param table 
     */
    void _compute_all_columns(
        std::vector<std::shared_ptr<t_data_table>> tables);

    /**
     * @brief Add all valid computed columns to `table` with the specified
     * `dtype`. Used when a column needs to be present for future operations,
     * but when a computation is not necessary/the dtype of the column != the
     * dtype of the actual computed column.
     * 
     * @param table 
     * @param dtype 
     */
    void _add_all_computed_columns(
        std::shared_ptr<t_data_table> table,
        t_dtype dtype);

    /**
     * @brief Add a computed column to `tbl` without computing it.
     * 
     * @param computed_column 
     * @param tbl 
     */
    void _add_computed_column(
        const t_computed_column_definition& computed_column,
        std::shared_ptr<t_data_table> tbl);

    /**
     * @brief Apply a computed column to `tbl`.
     * 
     * @param computed_column 
     * @param tbl 
     */
    void _compute_column(
        const t_computed_column_definition& computed_column,
        std::shared_ptr<t_data_table> tbl);

    /**
     * @brief Recompute the computed column on `flattened`,
     * using information from both `flattened` and `tbl`.
     * 
     * @param ctx 
     * @param tbl 
     */
    void _recompute_column(
        const t_computed_column_definition& computed_column,
        std::shared_ptr<t_data_table> table,
        std::shared_ptr<t_data_table> flattened,
        const std::vector<t_rlookup>& changed_rows);

private:
    /**
     * @brief Process the input data table by flattening it, calculating
     * transitional values, and returning a new masked version.
     * 
     * @return t_process_table_result a struct containing a pointer to the
     * flattened and masked data table, and a boolean on whether the
     * user's `on_update` callbacks should be called.
     */
    t_process_table_result _process_table();

    t_gnode_processing_mode m_mode;
    t_gnode_type m_gnode_type;

    // A `t_schema` containing all columns, including internal metadata columns.
    t_schema m_input_schema;

    // A `t_schema` containing all columns (excluding internal columns).
    t_schema m_output_schema;

    // A vector of `t_schema`s for each transitional `t_data_table`.
    std::vector<t_schema> m_transitional_schemas;

    t_computed_column_map m_computed_column_map;

    bool m_init;
    std::vector<std::shared_ptr<t_port>> m_iports;
    std::vector<std::shared_ptr<t_port>> m_oports;
    std::map<std::string, t_ctx_handle> m_contexts;
    std::shared_ptr<t_gstate> m_gstate;
    t_uindex m_id;
    std::chrono::high_resolution_clock::time_point m_epoch;
    std::vector<t_custom_column> m_custom_columns;
    std::function<void()> m_pool_cleanup;
    bool m_was_updated;
};

/**
 * @brief Given a t_data_table and a context handler, construct the t_tables relating to delta
 * calculation and notify the context with the constructed tables.
 *
 * @tparam CTX_T
 * @param flattened
 * @param ctxh
 */
template <typename CTX_T>
void
t_gnode::notify_context(const t_data_table& flattened, const t_ctx_handle& ctxh) {
    CTX_T* ctx = ctxh.get<CTX_T>();
    // These tables are guaranteed to have all computed columns.
    const t_data_table& delta = *(m_oports[PSP_PORT_DELTA]->get_table().get());
    const t_data_table& prev = *(m_oports[PSP_PORT_PREV]->get_table().get());
    const t_data_table& current = *(m_oports[PSP_PORT_CURRENT]->get_table().get());
    const t_data_table& transitions = *(m_oports[PSP_PORT_TRANSITIONS]->get_table().get());
    const t_data_table& existed = *(m_oports[PSP_PORT_EXISTED]->get_table().get());
    notify_context<CTX_T>(ctx, flattened, delta, prev, current, transitions, existed);
}

/**
 * @brief Given multiple `t_data_table`s containing the different states of the context,
 * update the context with new data.
 *
 * Called on updates and additions AFTER a view is constructed from the table/context.
 *
 * @tparam CTX_T
 * @param ctx
 * @param flattened a `t_data_table` containing the flat data for the context
 * @param delta a `t_data_table` containing the changes to the dataset
 * @param prev a `t_data_table` containing the previous state
 * @param current a `t_data_table` containing the current state
 * @param transitions a `t_data_table` containing operations to transform the context
 * @param existed
 */
template <typename CTX_T>
void
t_gnode::notify_context(CTX_T* ctx, const t_data_table& flattened, const t_data_table& delta,
    const t_data_table& prev, const t_data_table& current, const t_data_table& transitions,
    const t_data_table& existed) {
    auto ctx_config = ctx->get_config();
    auto computed_columns = ctx_config.get_computed_columns();

    ctx->step_begin();
    // Flattened has the computed columns at this point, as it has
    // passed through the body of `process_table`.
    ctx->notify(flattened, delta, prev, current, transitions, existed);
    ctx->step_end();
}

/**
 * @brief Given a flattened `t_data_table`, update the context with the table.
 *
 * Called with the context is initialized with a table.
 *
 * @tparam CTX_T the template type
 * @param ctx a pointer to a `t_context` object
 * @param flattened the flattened `t_data_table` containing data for the context
 */
template <typename CTX_T>
void
t_gnode::update_context_from_state(
    CTX_T* ctx, std::shared_ptr<t_data_table> flattened) {
    PSP_TRACE_SENTINEL();
    PSP_VERBOSE_ASSERT(m_init, "touching uninited object");
    PSP_VERBOSE_ASSERT(
        m_mode == NODE_PROCESSING_SIMPLE_DATAFLOW, "Only simple dataflows supported currently")

    if (flattened->size() == 0)
        return;

    // Flattened won't have the computed columns if it didn't pass through the
    // main body of `process_table`, i.e. creating a 1/2 sided context, so
    // compute again here.
    auto computed_columns = m_computed_column_map.m_computed_columns;

    if (computed_columns.size() > 0) {
        for (const auto& computed : computed_columns) {
            _compute_column(computed.second, flattened);
        }
    }

    // Need to cast shared ptr to a const reference before passing to notify,
    // reference is valid as `notify` is not async
    const t_data_table& const_flattened = 
        const_cast<const t_data_table&>(*flattened);

    ctx->step_begin();
    ctx->notify(const_flattened);
    ctx->step_end();
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
    const t_process_state& process_state);

template <typename DATA_T>
void
t_gnode::_process_column(
    const t_column* flattened_column,
    const t_column* gstate_column,
    t_column* delta_column,
    t_column* prev_column,
    t_column* current_column,
    t_column* transitions_column,
    t_column* diff_column,
    const t_process_state& process_state) {
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

                DATA_T prev_value;
                memset(&prev_value, 0, sizeof(DATA_T));
                bool prev_valid = false;

                DATA_T current_value = *(flattened_column->get_nth<DATA_T>(idx));
                bool cur_valid = flattened_column->is_valid(idx);

                if (row_already_exists) {
                    prev_value = *(gstate_column->get_nth<DATA_T>(rlookup.m_idx));
                    prev_valid = gstate_column->is_valid(rlookup.m_idx);
                }

                bool exists = cur_valid;
                bool prev_existed = row_already_exists && prev_valid;

                // Whether the previous and the current value are equal. If
                // the values are equal, the cell is not updated. If all values
                // in an update (across all columns and rows) are equal to
                // their previous values, an update is considered a no-op
                // and `on_update` callbacks will not fire.
                bool prev_cur_eq = prev_value == current_value;

                // If at any point, the previous and current values are not
                // equal, set `m_has_new_values` to true to make sure that
                // `on_update` callbacks are triggered.
                if (!prev_cur_eq && !should_notify_userspace) {
                    std::cout << "`" << prev_value << "`, `" << current_value << "`, " << std::boolalpha  << prev_cur_eq << std::endl;
                    should_notify_userspace = true;
                }

                auto trans = calc_transition(prev_existed, row_already_exists, exists, prev_valid,
                    cur_valid, prev_cur_eq, prev_pkey_eq);

                delta_column->set_nth<DATA_T>(
                    added_count, cur_valid ? current_value - prev_value : DATA_T(0));
                delta_column->set_valid(added_count, true);

                prev_column->set_nth<DATA_T>(added_count, prev_value);
                prev_column->set_valid(added_count, prev_valid);

                current_column->set_nth<DATA_T>(added_count, cur_valid ? current_value : prev_value);

                current_column->set_valid(added_count, cur_valid ? cur_valid : prev_valid);

                transitions_column->set_nth<std::uint8_t>(idx, trans);
            } break;
            case OP_DELETE: {
                if (row_already_exists) {
                    DATA_T prev_value = *(gstate_column->get_nth<DATA_T>(rlookup.m_idx));
                    bool prev_valid = gstate_column->is_valid(rlookup.m_idx);

                    prev_column->set_nth<DATA_T>(added_count, prev_value);
                    prev_column->set_valid(added_count, prev_valid);

                    current_column->set_nth<DATA_T>(added_count, prev_value);
                    current_column->set_valid(added_count, prev_valid);

                    SUPPRESS_WARNINGS_VC(4146)
                    delta_column->set_nth<DATA_T>(added_count, -prev_value);
                    RESTORE_WARNINGS_VC()
                    delta_column->set_valid(added_count, true);

                    transitions_column->set_nth<std::uint8_t>(added_count, VALUE_TRANSITION_NEQ_TDF);
                }
            } break;
            default: { PSP_COMPLAIN_AND_ABORT("Unknown OP"); }
        }
    }

    diff_column->set_nth<bool>(0, should_notify_userspace);
}

} // end namespace perspective
