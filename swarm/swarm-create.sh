echo "Creating Multi Host Keystore"
docker-machine create -d virtualbox mh-keystore
eval "$(docker-machine env mh-keystore)"
echo "Starting Consul at Keystore Machine"
docker run -d -p "8500:8500" -h "consul"  progrium/consul -server -bootstrap
echo "Creating Swarm master ..."
docker-machine create -d virtualbox --swarm --swarm-master --swarm-strategy "spread" --swarm-discovery="consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-store=consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-advertise=eth1:2376" swarm-master
echo "Creating Swarm node 01 ..."
docker-machine create -d virtualbox --swarm --swarm-discovery="consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-store=consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-advertise=eth1:2376"  swarm-node-01
echo "Creating Swarm node 02 ..."
docker-machine create -d virtualbox --swarm --swarm-discovery="consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-store=consul://$(docker-machine ip mh-keystore):8500" --engine-opt="cluster-advertise=eth1:2376"  swarm-node-02
