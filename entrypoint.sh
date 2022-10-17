#!/bin/bash

chromedriver &
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start chromedriver: $status"
  exit $status
fi

python -u main.py
exit $?
