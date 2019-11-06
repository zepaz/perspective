import os
import os.path
import sys
import logging
import tornado.websocket
import tornado.web
import tornado.ioloop
import pandas as pd

sys.path.insert(1, os.path.join(os.path.dirname(__file__), '..'))
from perspective import Table, PerspectiveManager, PerspectiveTornadoHandler


class MainHandler(tornado.web.RequestHandler):

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def get(self):
        self.render("perspective_tornado_client.html")


def make_app(MANAGER):
    '''Create and return a Tornado app.

    For `PerspectiveTornadoHandler` to work, it must be passed an instance of `PerspectiveManager`.

    The data is loaded into a new `Table`, which is passed to the manager through `host_table`.
    The front-end is able to look up the table using the name provided to `host_table`.
    '''
    return tornado.web.Application([
        (r"/", MainHandler),
        # create a websocket endpoint that the client Javascript can access
        (r"/websocket", PerspectiveTornadoHandler, {"manager": MANAGER, "check_origin": True})
    ])


if __name__ == "__main__":
    # Because we use `PerspectiveTornadoHandler`, all that needs to be done in `init` is to start the Tornado server.
    print(os.getpid())
    MANAGER = PerspectiveManager()
    TABLE = Table(pd.util.testing.makeTimeDataFrame(50000))
    MANAGER.host_table("data_source_one", TABLE)
    input("wait...")
    app = make_app(MANAGER)
    app.listen(8888)
    logging.critical("Listening on http://localhost:8888")
    loop = tornado.ioloop.IOLoop.current()

    # update with new data every 50ms
    def updater():
        print("creating df")
        nd = pd.util.testing.makeTimeDataFrame(50000)
        print("UPDATING")
        TABLE.update(nd)

    # loop.call_later(delay=10, callback=updater)
    loop.start()
