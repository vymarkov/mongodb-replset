FROM node:5.10-onbuild

RUN apt-get update &&\
  apt-get install redis-tools -y