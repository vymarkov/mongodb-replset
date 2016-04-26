TAG=${IMAGE_TAG:-"latest"}
IMAGE_NAME=${IMAGE_NAME:-"lynx"}

docker build --no-cache -t vymarkov/$IMAGE_NAME -f Dockerfile .
docker login --username $DOCKER_REGISTRY_USERNAME --email $DOCKER_REGISTRY_EMAIL --password $DOCKER_REGISTRY_PASS
docker push vymarkov/$IMAGE_NAME:$TAG

if [ "$TAG" != "latest" ]; then
	docker tag vymarkov/$IMAGE_NAME vymarkov/$IMAGE_NAME:$TAG	
	docker push vymarkov/$IMAGE_NAME:latest
fi