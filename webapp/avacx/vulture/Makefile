## Makefile for building and installing the vulture CLI

.PHONY: build install uninstall

BINARY := vulture
CMD_DIR := ./cmd

build:
	go build -o $(BINARY) $(CMD_DIR)

install: build
	@echo "Moving $(BINARY) to /usr/local/bin (requires sudo)"
	sudo mv $(BINARY) /usr/local/bin/
	sudo chmod +x /usr/local/bin/$(BINARY)

uninstall:
	@echo "Removing /usr/local/bin/$(BINARY) (requires sudo)"
	sudo rm -f /usr/local/bin/$(BINARY)
