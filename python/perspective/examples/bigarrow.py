import os
import os.path
import sys
import logging
import tornado.websocket
import tornado.web
import tornado.ioloop
import time
import pandas as pd

sys.path.insert(1, os.path.join(os.path.dirname(__file__), '..'))
from perspective import Table, PerspectiveManager, PerspectiveTornadoHandler


logging.basicConfig(format='%(asctime)s %(message)s')


class MainHandler(tornado.web.RequestHandler):

    def set_default_headers(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "x-requested-with")
        self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def get(self):
        self.render("bigarrow.html")


here = os.path.abspath(os.path.dirname(__file__))


def make_app():
    # Create an instance of `PerspectiveManager` and a table.
    MANAGER = PerspectiveManager()
    TABLE = None
    VIEW = None

    with open(os.path.join(here, "superstore_big.arrow"), "rb") as arrow:
        TABLE = Table(arrow.read())
        VIEW = TABLE.view()

    # Track the table with the name "data_source_one", which will be used in
    # the front-end to access the Table.
    MANAGER.host_table("table", TABLE)
    MANAGER.host_view("view", VIEW)

    return tornado.web.Application([
        (r"/", MainHandler),
        # create a websocket endpoint that the client Javascript can access
        (r"/websocket", PerspectiveTornadoHandler, {"manager": MANAGER, "check_origin": True})
    ], websocket_ping_interval=15)


if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    logging.critical("Listening on http://localhost:8888")
    loop = tornado.ioloop.IOLoop.current()
    loop.start()
