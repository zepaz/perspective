import os
import os.path
import tornado.websocket
import tornado.web
import tornado.ioloop
import logging
import random
import sys
from datetime import datetime
import pandas as pd
from faker import Faker
fake = Faker()

sys.path.insert(1, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
from perspective import Table, PerspectiveManager, PerspectiveTornadoHandler  # noqa: E402


'''Set up our data for this example.'''
SECURITIES = ["AAPL.N", "AMZN.N", "QQQ.N", "NVDA.N", "TSLA.N", "FB.N", "MSFT.N", "TLT.N", "XIV.N", "YY.N", "CSCO.N", "GOOGL.N", "PCLN.N"]
CLIENTS = ["Homer", "Marge", "Bart", "Lisa", "Maggie", "Moe", "Lenny", "Carl", "Krusty"]


def data_source(count):
    rows = []
    modifier = random.random() * random.randint(1, 50)
    for i in range(count):
        bid = (random.random() * 100 + random.randint(0, 9)) * modifier
        ask = (random.random() * 105 + random.randint(1, 3)) * modifier
        rows.append({
            "name": SECURITIES[random.randint(0, len(SECURITIES) - 1)],
            "client": CLIENTS[random.randint(0, len(CLIENTS) - 1)],
            "vol": random.randint(100, 100000),
            "bid": bid,
            "ask": ask,
            "spread": ask - bid,
            "lastUpdate": datetime.now()
        })
    return rows


def superstore(count=10):
    data = []
    print("Creating dataset of {0} rows".format(count))
    for id in range(count):
        dat = {}
        dat['Row ID'] = id
        dat['Order ID'] = fake.ein()
        dat['Order Date'] = fake.date_this_year()
        dat['Ship Date'] = fake.date_between_dates(dat['Order Date']).strftime('%Y-%m-%d')
        dat['Order Date'] = dat['Order Date'].strftime('%Y-%m-%d')
        dat['Ship Mode'] = random.choice(['First Class', 'Standard Class', 'Second Class'])
        dat['Ship Mode'] = random.choice(['First Class', 'Standard Class', 'Second Class'])
        dat['Customer ID'] = fake.license_plate()
        dat['Segment'] = random.choice(['A', 'B', 'C', 'D'])
        dat['Country'] = 'US'
        dat['City'] = fake.city()
        dat['State'] = fake.state()
        dat['Postal Code'] = fake.zipcode()
        dat['Region'] = random.choice(['Region %d' % i for i in range(5)])
        dat['Product ID'] = fake.bban()
        sector = random.choice(['Industrials', 'Technology', 'Financials'])
        industry = random.choice(['A', 'B', 'C'])
        dat['Category'] = sector
        dat['Sub-Category'] = industry
        dat['Sales'] = random.randint(1, 100) * 100
        dat['Quantity'] = random.randint(1, 100) * 10
        dat['Discount'] = round(random.random() * 100, 2)
        dat['Profit'] = round(random.random() * 1000, 2)
        data.append(dat)
    return pd.DataFrame(data)


def make_app():
    '''Create and return a Tornado app.

    For `PerspectiveTornadoHandler` to work, it must be passed an instance of `PerspectiveManager`.

    The data is loaded into a new `Table`, which is passed to the manager through `host_table`.
    The front-end is able to look up the table using the name provided to `host_table`.
    '''
    MANAGER = PerspectiveManager()
    # DF = pd.DataFrame(data_source(10000))
    DF = superstore(10000)
    TABLE = Table(DF)
    MANAGER.host_table("data_source_one", TABLE)

    '''
    # update with new data every 500ms
    def updater():
        TABLE.update(data_source(10))

    callback = tornado.ioloop.PeriodicCallback(callback=updater, callback_time=50)
    callback.start()
    '''

    return tornado.web.Application([
        # create a websocket endpoint that the client Javascript can access
        (r"/websocket", PerspectiveTornadoHandler, {"manager": MANAGER, "check_origin": True})
    ])


if __name__ == "__main__":
    # Because we use `PerspectiveTornadoHandler`, all that needs to be done in `init` is to start the Tornado server.
    app = make_app()
    app.listen(3001)
    logging.critical("Listening on http://localhost:3001/websocket")
    loop = tornado.ioloop.IOLoop.current()
    loop.start()
