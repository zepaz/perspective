---
id: overview
title: Overview
---

<img src="../static/svg/architecture.svg"></svg>

Perspective can be used in exactly three ways.

A single web application can use one or a mix of these architectures,
depending on the need.

# Client-only

<img src="../static/svg/architecture.sub1.svg"></svg>

For static datasets, data sets provided by the user, simple server-less and
read-only web applications.

Very good interactive performance, uses WebAssembly engine for near-native
runtime plus WebWorker isolation for parallel rendering within the browser.
Operations like scrolling and creating new views are responsive.

But the entire dataset must be downloaded to the client.  Perspective is not a
typical browser component, and datset sizes of 1gb+ in Apache Arrow format will
load fine with good interactive performance!

Use JSON, CSV or Apache Arrow format data from any standard web service.  Once
the data is loaded though, no server connection is needed and all operations
occur in the client browser via WebAssembly.

Horizontal scaling is a non-issue, since here is no concurrent state to scale,
and only uses client-side computation via WebAssembly client.  Client-only
perspective can support as many concurrent users as can download the web
application itself.

Updates and edits are local to the browser client and will be lost when the
page is refreshed unless otherwise persisted.

```javascript
const worker = perspective.worker();
const table = worker.table(csv);

const viewer = document.createElement("perspective-viewer");
document.body.appendChild(viewer);
viewer.load(table);
```

# Client/Server Distributed

<img src="../static/svg/architecture.sub3.svg"></svg>

For medium-sized, real-time, synchronized and/or editable data sets with many
concurrent users.  Dataset is instantiated in-memory with a Python or Node.js
server, and web applications create duplicates of these tables in a local
WebAssembly client in the browser, synchonized to the server via Apache Arrow.

Scales well with additional concurrent users.  Browsers need only download
the initial data set and subsequent update deltas, while operations like
scrolling, group-by, sorting, etc. are performed on the client.  Python
servers can make good use of additional threads as perspective in this
architecture will release the GIL for almost all operations.

Interactive performance on the client is very good, identical to client-only
architecture.

But also updates and edits can be seamlessly synchonized across clients via
their virtual server counterparts.

Python and Tornado server:

```python
table = Table(csv)

manager = PerspectiveManager()
manager.host("my_table", table)

app = tornado.web.Application(
    [
        (
            r"/websocket",
            PerspectiveTornadoHandler,
            {"manager": manager, "check_origin": True},
        )
    ]
)

app.listen(8080)
loop = tornado.ioloop.IOLoop.current()
loop.start()
```

Javascript client:

```javascript
const websocket = perspective.websocket("ws://localhost:8080");
const server_table = websocket.open("my_table");

const worker = perspective.worker();
const client_table = worker.table(server_table.view());

const viewer = document.createElement("perspective-viewer");
document.body.appendChild(viewer);
viewer.load(client_table);
```

# Server-only

<img src="../static/svg/architecture.sub2.svg"></svg>

For extremely large datasets with a small number of concurrent users.  Dataset
is instantiated in-memory with a Python or Node.js server, and web applications
connect virtually.

Has very good initial load performance, since no data is downloaded.  Group-by
and other operations will run column-parallel if configured.

But interactive performance is poor, as every user interaction must page the
server to render.  Operations like scrolling are not as responsive and can be
impacted by network latency.

Web applications must be "always connected" to the server via WebSocket.  
Disconnecting will prevent any interaction, scrolling, etc. of the UI.  Does not
use WebAssembly.

Each connected browser will impact server performance as long as the
connection is open, which in turn impacts interactive performance of every
client.  This ultimately limits the horizontal scalabity of this architecture.

Since each client reads the perspective `Table` virtually, changes like edits
and updates are automatically reflected to all clients and persist across
browser refresh.

Using the same Python server as the previous design, we can simply skip the
intermediate WebAssembly `Table` and pass the virtual table directly to `load()`

```javascript
const websocket = perspective.websocket("ws://localhost:8080");
const server_table = websocket.open("my_table");

const viewer = document.createElement("perspective-viewer");
document.body.appendChild(viewer);
viewer.load(server_table);
```
