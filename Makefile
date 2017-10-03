LIB_DIR = $(shell find ./core -type d)
IN_FILE = $(shell find ./proto -name "*.json")
OUT_DIR = ./output
RECORD_DIR = ./record
BIN = ./core/main.js

.PHONY: all

all: $(IN_FILE)
	#export NODE_PATH=$NODE_PATH:$(LIB_DIR)
	node $(BIN) clear
	$(foreach file, $(IN_FILE), node $(BIN) $(file) $(OUT_DIR))

clean: 
	rm -rf $(OUT_DIR)
	rm -rf $(RECORD_DIR)
	node $(BIN) clear