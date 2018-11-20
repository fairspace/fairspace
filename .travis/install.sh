#!/bin/bash

if [[ $SHOULD_RELEASE ]]; then
  $BUILD_SCRIPTS_DIR/az/install.sh
  $BUILD_SCRIPTS_DIR/az/login.sh
  $BUILD_SCRIPTS_DIR/k8s/install_kubectl.sh
  $BUILD_SCRIPTS_DIR/k8s/config_kubectl.sh
  $BUILD_SCRIPTS_DIR/k8s/switch_context.sh
  export PATH="$HOME/downloads/v${KUBECTL_VERSION}:$PATH"
fi
