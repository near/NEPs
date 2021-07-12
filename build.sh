#!/bin/sh -e

cargo install mdbook
mdbook clean
mdbook build
