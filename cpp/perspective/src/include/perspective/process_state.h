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
#include <perspective/rlookup.h>

namespace perspective {

struct t_process_state {
    t_process_state();

    std::shared_ptr<t_data_table> m_state_data_table;
    std::shared_ptr<t_data_table> m_flattened_data_table;
    std::shared_ptr<t_data_table> m_delta_data_table;
    std::shared_ptr<t_data_table> m_prev_data_table;
    std::shared_ptr<t_data_table> m_current_data_table;
    std::shared_ptr<t_data_table> m_transitions_data_table;

    std::vector<t_rlookup> m_lookup;
    std::vector<t_uindex> m_col_translation;
    std::vector<t_uindex> m_added_offset;
    std::vector<bool> m_prev_pkey_eq_vec;

    std::uint8_t* m_op_base;
};

} // end namespace perspective