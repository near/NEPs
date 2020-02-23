#!/bin/bash
set -e

mdbook build
cp CNAME docs/CNAME
