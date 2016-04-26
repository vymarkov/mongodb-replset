# docker build -t vymarkov/lynx .
# docker tag vymarkov/lynx vymarkov/lynx:latest
# docker push vymarkov/lynx:latest

FROM node:5.10
MAINTAINER Vitaly Markov "v.y.markov@gmail.com"

RUN apt-get update &&\
	apt-get install python-pip -y &&\
	pip install httpie

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY npm-shrinkwrap.json /usr/src/app/

RUN npm install
COPY . /usr/src/app
RUN npm run build

CMD npm start