FROM debian:12

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y ca-certificates
RUN mkdir /opt/toilet-map
COPY backend /opt/toilet-map
COPY .env /opt/toilet-map
COPY static /opt/toilet-map/static
WORKDIR /opt/toilet-map
CMD ["/opt/toilet-map/backend"]
