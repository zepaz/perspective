/******************************************************************************
 *
 * Copyright (c) 2019, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
#ifdef PSP_ENABLE_PYTHON
#include <perspective/python/fill.h>
#include <perspective/python/numpy.h>

using namespace perspective;

namespace perspective {
namespace numpy {

    NumpyLoader::NumpyLoader(py::object accessor)
        : m_accessor(accessor) {}

    NumpyLoader::~NumpyLoader() {}

    void
    NumpyLoader::fill_table(t_data_table& tbl, const t_schema& input_schema,
        const std::string& index, std::uint32_t offset, std::uint32_t limit, bool is_update) {
        bool implicit_index = false;
        std::vector<std::string> col_names(input_schema.columns());
        std::vector<t_dtype> data_types(input_schema.types());

        for (auto cidx = 0; cidx < col_names.size(); ++cidx) {
            auto name = col_names[cidx];
            auto type = data_types[cidx];

            if (name == "__INDEX__") {
                implicit_index = true;
                std::shared_ptr<t_column> pkey_col_sptr = tbl.add_column_sptr("psp_pkey", type, true);
                fill_column(tbl, pkey_col_sptr, "psp_pkey", type, cidx, is_update);
                tbl.clone_column("psp_pkey", "psp_okey");
                continue;
            }

            auto col = tbl.get_column(name);
            fill_column(tbl, col, name, type, cidx, is_update);
        }

        // Fill index column - recreated every time a `t_data_table` is created.
        if (!implicit_index) {
            if (index == "") {
                // Use row number as index if not explicitly provided or provided with `__INDEX__`
                auto key_col = tbl.add_column("psp_pkey", DTYPE_INT32, true);
                auto okey_col = tbl.add_column("psp_okey", DTYPE_INT32, true);

                for (std::uint32_t ridx = 0; ridx < tbl.size(); ++ridx) {
                    key_col->set_nth<std::int32_t>(ridx, (ridx + offset) % limit);
                    okey_col->set_nth<std::int32_t>(ridx, (ridx + offset) % limit);
                }
            } else {
                tbl.clone_column(index, "psp_pkey");
                tbl.clone_column(index, "psp_okey");
            }
        }
    }

    
    void 
    NumpyLoader::fill_column(t_data_table& tbl, std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        // Force path for datetimes
        if (type == DTYPE_TIME) {
            fill_datetime_iter(col, name, type, cidx, is_update);
            return;
        }
        
        try {
            py::dict source = m_accessor.attr("_get_numpy_column")(name);
            py::object array = source["array"];
            py::object mask = source["mask"];
            copy_array(array, col, 0);

            // Fill validity map
            col->valid_raw_fill();
            col->pprint();
            auto num_invalid = len(mask);

            if (num_invalid > 0) {
                py::array_t<std::uint64_t> null_array = mask;
                std::uint64_t* ptr = (std::uint64_t*) null_array.data();
                for (auto i = 0; i < num_invalid; ++i) {
                    std::uint64_t idx = ptr[i];
                    if (is_update) {
                        col->unset(idx);
                    } else {
                        col->clear(idx);
                    }
                }
            }

            col->pprint();
        } catch (const PerspectiveException& ex) {
            fill_column_iter(tbl, col, name, type, cidx, is_update);
        }
    }

    void
    NumpyLoader::fill_column_iter(t_data_table& tbl, std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        switch (type) {
            case DTYPE_TIME: {
                fill_datetime_iter(col, name, type, cidx, is_update);
            } break;
            case DTYPE_DATE: {
                fill_date_iter(col, name, type, cidx, is_update);
            } break;
            case DTYPE_STR: {
                fill_string_iter(col, name, type, cidx, is_update);
            } break;
            case DTYPE_BOOL: {
                fill_bool_iter(col, name, type, cidx, is_update);
            } break;
            default: {
                fill_numeric_iter(tbl, col, name, type, cidx, is_update);
                break;
            }
        }
    }

    void 
    NumpyLoader::fill_numeric_iter(t_data_table& tbl, std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        t_uindex nrows = col->size();

        for (auto i = 0; i < nrows; ++i) {
            t_val item = m_accessor.attr("marshal")(cidx, i, type);

            if (item.is_none()) {
                if (is_update) {
                    col->unset(i);
                } else {
                    col->clear(i);
                }
                continue;
            }

            switch (type) {
                case DTYPE_UINT8: {
                    col->set_nth(i, item.cast<std::uint8_t>());
                } break;
                case DTYPE_UINT16: {
                    col->set_nth(i, item.cast<std::uint16_t>());
                } break;
                case DTYPE_UINT32: {
                    col->set_nth(i, item.cast<std::uint32_t>());
                } break;
                case DTYPE_UINT64: {
                    col->set_nth(i, item.cast<std::uint64_t>());
                } break;
                case DTYPE_INT8: {
                    col->set_nth(i, item.cast<std::int8_t>());
                } break;
                case DTYPE_INT16: {
                    col->set_nth(i, item.cast<std::int16_t>());
                } break;
                case DTYPE_INT32: {
                    // This handles cases where a long sequence of e.g. 0 precedes a clearly
                    // float value in an inferred column. Would not be needed if the type
                    // inference checked the entire column/we could reset parsing.
                    double fval = item.cast<double>();
                    if (fval > 2147483647 || fval < -2147483648) {
                        tbl.promote_column(name, DTYPE_FLOAT64, i, true);
                        col = tbl.get_column(name);
                        type = DTYPE_FLOAT64;
                        col->set_nth(i, fval);
                    } else if (isnan(fval)) {
                        tbl.promote_column(name, DTYPE_STR, i, false);
                        col = tbl.get_column(name);
                        fill_string_iter(col, name, DTYPE_STR, cidx, is_update);
                        return;
                    } else {
                        col->set_nth(i, static_cast<std::int32_t>(fval));
                    }
                } break;
                case DTYPE_INT64: {
                    double fval = item.cast<double>();
                    if (isnan(fval)) {
                        tbl.promote_column(name, DTYPE_STR, i, false);
                        col = tbl.get_column(name);
                        fill_string_iter(col, name, DTYPE_STR, cidx, is_update);
                        return;
                    } else {
                        col->set_nth(i, static_cast<std::int64_t>(fval));
                    }
                } break;
                case DTYPE_FLOAT32: {
                    col->set_nth(i, item.cast<float>());
                } break;
                case DTYPE_FLOAT64: {
                    bool is_float = py::isinstance<py::float_>(item);
                    bool is_numpy_nan = is_float && npy_isnan(item.cast<double>());
                    if (!is_float || is_numpy_nan) {
                        tbl.promote_column(name, DTYPE_STR, i, false);
                        col = tbl.get_column(name);
                        fill_string_iter(col, name, DTYPE_STR, cidx, is_update);
                        return;
                    }
                    col->set_nth(i, item.cast<double>());
                } break;
                default:
                    break;
            }
        }
    }

    void
    NumpyLoader::fill_datetime_iter(std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        // memcpy doesn't work at the moment - simulate that path but iterate through
        t_uindex nrows = col->size();
        py::dict source = m_accessor.attr("_get_numpy_column")(name);
        py::array_t<std::int64_t> array = source["array"].cast<py::array_t<std::int64_t>>();
        std::int64_t* ptr = (std::int64_t*) array.data();

        for (auto i = 0; i < nrows; ++i) {
            col->set_nth(i, ptr[i] * 1000); // convert to milliseconds         
        }

        py::array_t<std::int64_t> mask = source["mask"].cast<py::array_t<std::int64_t>>();
        auto num_nulls = mask.size();
        std::int64_t* mask_ptr = (std::int64_t*) mask.request().ptr;
        for (auto i = 0; i < num_nulls; ++i) {
            col->set_valid(mask_ptr[i], false);
        }
    }

    void
    NumpyLoader::fill_date_iter(std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        t_uindex nrows = col->size();

        for (auto i = 0; i < nrows; ++i) {
            t_val item = m_accessor.attr("marshal")(cidx, i, type);

            if (item.is_none()) {
                if (is_update) {
                    col->unset(i);
                } else {
                    col->clear(i);
                }
                continue;
            }


            auto date_components = item.cast<std::map<std::string, std::int32_t>>();
            t_date dt = t_date(date_components["year"], date_components["month"], date_components["day"]);
            col->set_nth(i, dt);
        }
    }

    void
    NumpyLoader::fill_string_iter(std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        t_uindex nrows = col->size();

        for (auto i = 0; i < nrows; ++i) {
            t_val item = m_accessor.attr("marshal")(cidx, i, type);

            if (item.is_none()) {
                if (is_update) {
                    col->unset(i);
                } else {
                    col->clear(i);
                }
                continue;
            }

            // convert to a python string first
            std::wstring welem = item.cast<std::wstring>();
            std::wstring_convert<utf16convert_type, wchar_t> converter;
            std::string elem = converter.to_bytes(welem);
            col->set_nth(i, elem);
        }
    }

    void
    NumpyLoader::fill_bool_iter(std::shared_ptr<t_column> col, const std::string& name, t_dtype type, std::uint32_t cidx, bool is_update) {
        t_uindex nrows = col->size();
        py::dict source = m_accessor.attr("_get_numpy_column")(name);
        py::array array = source["array"].cast<py::object>();
        std::int32_t* ptr = (std::int32_t*) array.data();

        for (auto i = 0; i < nrows; ++i) {
            t_val item = m_accessor.attr("marshal")(cidx, i, type);

            if (item.is_none()) {
                if (is_update) {
                    col->unset(i);
                } else {
                    col->clear(i);
                }
                continue;
            }

            col->set_nth(i, item.cast<bool>());
        }
    }

    void
    NumpyLoader::copy_array(py::object src, std::shared_ptr<t_column> dest, const std::uint64_t offset) {
        std::int64_t length = py::len(src);

        // Ensure input is a a numpy array
        py::array array = py::array::ensure(src);

        if (!array) {
            PSP_COMPLAIN_AND_ABORT("Cannot copy a non-numpy array into Perspective.");
        }

        py::dtype dtype = array.dtype();
        
        std::cout << dtype.kind() << std::endl;

        // Cannot be templated without templating out the class
        if (py::isinstance<py::array_t<std::uint8_t>>(array)) {
            std::cout << "ui8" << std::endl;
            copy_array_helper<std::uint8_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::uint16_t>>(array)) {
            std::cout << "ui16" << std::endl;
            copy_array_helper<std::uint16_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::uint32_t>>(array)) {
            std::cout << "ui32" << std::endl;
            copy_array_helper<std::uint32_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::uint64_t>>(array)) {
            std::cout << "ui64" << std::endl;
            copy_array_helper<std::uint64_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::int8_t>>(array)) {
            std::cout << "i8" << std::endl;
            copy_array_helper<std::int8_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::int16_t>>(array)) {
            std::cout << "i16" << std::endl;
            copy_array_helper<std::int16_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::int32_t>>(array)) {
            std::cout << "i32" << std::endl;
            copy_array_helper<std::int32_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<std::int64_t>>(array)) {
            std::cout << "i64" << std::endl;
            copy_array_helper<std::int64_t>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<float>>(array)) {
            std::cout << "FLOAT" << std::endl;
            copy_array_helper<float>(array.data(), dest, offset);
        } else if (py::isinstance<py::array_t<double>>(array)) {
            std::cout << "DOUBLE" << std::endl;
            copy_array_helper<double>(array.data(), dest, offset);
        } else {
            std::stringstream ss;
            ss << "Could not copy numpy array of dtype '" << dtype.kind() << "'" << std::endl;
            std::cout << ss.str() << std::endl;
            PSP_COMPLAIN_AND_ABORT(ss.str());
        }
    }

    template <typename T>
    void copy_array_helper(const void* src, std::shared_ptr<t_column> dest, const std::uint64_t offset) {
        std::memcpy(dest->get_nth<T>(offset), src, dest->size() * sizeof(T));
    }
    
} // namespace numpy
} // namespace perspective
#endif