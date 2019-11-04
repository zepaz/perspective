# `perspective-python` and `perspective-phosphor` example

With `perspective-python`, we are able to host large datasets and perform operations that go beyond WebAssembly's 2GB heap limit.

This example shows how a Tornado server running `perspective-python` can be used in conjunction with `perspective-phosphor` to create
editable, multi-user dashboards. Edits made by users are propagated back to the server, and streamed to each user at the same time.

Users are able to create their own views on the dataset.

## Instructions

```bash
yarn # install dependencies
yarn server # start python server

# FROM ANOTHER SHELL, run:
yarn start
```
