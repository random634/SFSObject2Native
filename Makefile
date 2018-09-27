LIB_DIR = $(shell find ./core -type d)
IN_FILE = $(shell find ./proto -name "*.json")
TMP_DIR = ./tmp
OUT_DIR = ./output
RECORD_DIR = ./record
BIN = ./core/main.js
CP = ./cp.js

.PHONY: all

all: $(IN_FILE)
	@#export NODE_PATH=$NODE_PATH:$(LIB_DIR)
	node $(BIN) clear
	
	@#$(foreach file, $(IN_FILE), node $(BIN) $(file) $(OUT_DIR);)	
	@for file in $(IN_FILE); do \
		echo dealFile: $$file; \
		node $(BIN) $$file $(TMP_DIR); \
	done;

	@#do the cp thing
	node $(CP) $(TMP_DIR) $(OUT_DIR)

clean: 
	find $(OUT_DIR) -name '*.js' -exec rm {} \;
	find $(RECORD_DIR) -name '*.json' -exec rm {} \;
	node $(BIN) clear
