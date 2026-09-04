#!/usr/bin/env bash
echo "==========================================================="
echo "       MAQ AUTO EDITOR ULTRA - UNIX/LINUX LAUNCHER"
echo "==========================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

export NODE_PATH=/usr/share/nodejs:${NODE_PATH}
node launcher.js
