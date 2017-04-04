#!/bin/bash
kill $(pidof "node server.js")
node server.js