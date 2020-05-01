/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

#include <perspective/first.h>
#include <perspective/pool.h>
#include <perspective/update_task.h>

namespace perspective {
t_update_task::t_update_task(t_pool& pool)
    : m_pool(pool) {}

void
t_update_task::run() {
    auto work_to_do = m_pool.m_data_remaining.load();
    bool should_notify_userspace = false;
    if (work_to_do) {
        m_pool.m_data_remaining.store(true);
        for (auto g : m_pool.m_gnodes) {
            if (g) {
                bool _should_notify = g->_process();
                if (!should_notify_userspace) {
                    // If it's false, set it with the value from the gnode.
                    // Otherwise, if true, it will never be set to false by a
                    // later _process that returns false.
                    should_notify_userspace = _should_notify;
                }
            }
        }
        for (auto g : m_pool.m_gnodes) {
            if (g)
                g->clear_output_ports();
        }
        m_pool.m_data_remaining.store(false);
    }
    if (should_notify_userspace) {
        std::cout << "notifying" << std::endl;
        m_pool.notify_userspace();
    } else {
        std::cout << "NOT notifying" << std::endl;
    }
    m_pool.inc_epoch();
}

void
t_update_task::run(t_uindex gnode_id) {
    auto work_to_do = m_pool.m_data_remaining.load();
    bool should_notify_userspace = false;
    if (work_to_do) {
        for (auto g : m_pool.m_gnodes) {
            if (g) {
                bool _should_notify = g->_process();
                if (!should_notify_userspace) {
                    // If it's false, set it with the value from the gnode.
                    // Otherwise, if true, it will never be set to false by a
                    // later _process that returns false.
                    should_notify_userspace = _should_notify;
                }
            }
        }
        m_pool.m_data_remaining.store(true);
        for (auto g : m_pool.m_gnodes) {
            if (g)
                g->clear_output_ports();
        }
        m_pool.m_data_remaining.store(false);
    }
    if (should_notify_userspace) {
        m_pool.notify_userspace();
    }
    m_pool.inc_epoch();
}
} // end namespace perspective
