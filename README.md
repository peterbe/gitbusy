# gitbusy

An experiment to try to visualize how busy people are on a set of GitHub repos.

## License

MPL-2.0

## To dev

Create a `.env` file and put into it [a GitHub personal access token](https://github.com/settings/tokens):

    echo 'GITHUB_API_TOKEN=xxxxxxxx' > .env

Install the Python dependencies and start Django:

    pip install -r requirements.txt
    ./manage.py runserver 0.0.0.0:8000

In another terminal install the Node dependencies and start Preact:

    cd frontend
    yarn install
    PORT=3000 yarn start

Now, go to `http://localhost:3000` and play.

## Using docker

To build:

    docker build . -t gitbusy

To run:

    docker run -t -i --rm -v ${pwd}:/app:rw --env-file .env -p 8000:8000 gitbusy
