/******************************************************************************
 *
 * Copyright (c) 2019, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
#ifdef PSP_ENABLE_PYTHON
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
                fill_column(pkey_col_sptr, "psp_pkey", type, is_update);
                //fill_column(tbl, pkey_col_sptr, "psp_pkey", cidx, type, is_update);
                tbl.clone_column("psp_pkey", "psp_okey");
                continue;
            }

            auto col = tbl.get_column(name);
            fill_column(col, name, type, is_update);
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
    NumpyLoader::fill_column(std::shared_ptr<t_column> col, const std::string& name, t_dtype type, bool is_update) {
        std::cout << "FILLING " << name << std::endl;
        py::dict source = m_accessor.attr("_get_numpy_column")(name);
        py::object array = source["array"];
        py::object mask = source["mask"];
        copy_array(array, col, 0);

        // Fill validity map
        col->valid_raw_fill();
        auto num_invalid = len(mask);

        if (num_invalid > 0) {
            py::array_t<std::uint64_t> null_array = mask;
            std::uint64_t* ptr = (std::uint64_t*) null_array.request().ptr;
            for (auto i = 0; i < num_invalid; ++i) {
                std::uint64_t idx = ptr[i];
                col->set_valid(idx, false);
            }
        }
    }

    void
    NumpyLoader::copy_array(py::object src, std::shared_ptr<t_column> dest, const std::uint64_t offset) {
        std::int64_t length = py::len(src);

        // Cannot be templated without templating out the class
        if (py::isinstance<py::array_t<std::uint8_t>>(src)) {
            py::array_t<std::uint8_t> array = src; 
            std::uint8_t* ptr = (std::uint8_t*) array.request().ptr;
            copy_array_helper<std::uint8_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::uint16_t>>(src)) {
            py::array_t<std::uint16_t> array = src; 
            std::uint16_t* ptr = (std::uint16_t*) array.request().ptr;
            copy_array_helper<std::uint16_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::uint32_t>>(src)) {
            py::array_t<std::uint32_t> array = src; 
            std::uint32_t* ptr = (std::uint32_t*) array.request().ptr;
            copy_array_helper<std::uint32_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::uint64_t>>(src)) {
            py::array_t<std::uint64_t> array = src; 
            std::uint64_t* ptr = (std::uint64_t*) array.request().ptr;
            copy_array_helper<std::uint64_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::int8_t>>(src)) {
            py::array_t<std::int8_t> array = src; 
            std::int8_t* ptr = (std::int8_t*) array.request().ptr;
            copy_array_helper<std::int8_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::int16_t>>(src)) {
            py::array_t<std::int16_t> array = src; 
            std::int16_t* ptr = (std::int16_t*) array.request().ptr;
            copy_array_helper<std::int16_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::int32_t>>(src)) {
            py::array_t<std::int32_t> array = src; 
            std::int32_t* ptr = (std::int32_t*) array.request().ptr;
            copy_array_helper<std::int32_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<std::int64_t>>(src)) {
            py::array_t<std::int64_t> array = src; 
            std::int64_t* ptr = (std::int64_t*) array.request().ptr;
            copy_array_helper<std::int64_t>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<float>>(src)) {
            py::array_t<float> array = src; 
            float* ptr = (float*) array.request().ptr;
            copy_array_helper<float>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<double>>(src)) {
            py::array_t<double> array = src; 
            double* ptr = (double*) array.request().ptr;
            copy_array_helper<double>(ptr, dest, length, offset);
        } else if (py::isinstance<py::array_t<bool>>(src)) {
            py::array_t<bool> array = src; 
            bool* ptr = (bool*) array.request().ptr;
            copy_array_helper<bool>(ptr, dest, length, offset);
        } else {
            // TODO: iterative
            std::string type_string = src.get_type().attr("__name__").cast<std::string>();
            std::stringstream ss;
            ss << "Could not copy numpy array of type " << type_string << std::endl;
            PSP_COMPLAIN_AND_ABORT(ss.str());
        }
    }

    template <typename T>
    void copy_array_helper(T* src, std::shared_ptr<t_column> dest, const std::uint64_t length, const std::uint64_t offset) {
        // assumes no nans, although nans are ?valid? in psp parlance - need to check
        std::memcpy((void*) dest->get_nth<T>(offset), (void*) src, length * sizeof(T));
    }
    
} // namespace numpy
} // namespace perspective
#endif