.PHONY: help dev backend mobile install install-backend install-mobile test lint clean kill reset-password check-user assign-team screenshot

.DEFAULT_GOAL := help

help: ## Show this menu
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Development
dev: ## Full stack — ngrok tunnel + backend + mobile
	bash start.sh

backend: ## Backend only (Convex + uvicorn)
	cd backend && bash dev.sh

mobile: ## Mobile only (Expo with tunnel)
	cd mobile && bash dev.sh

##@ Setup
install: install-backend install-mobile ## Install all dependencies (backend + mobile)

install-backend: ## Create backend venv and install Python deps
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

install-mobile: ## Install mobile npm deps
	cd mobile && npm install

##@ Quality
test: ## Run mobile tests
	cd mobile && npx jest

lint: ## Lint mobile code
	cd mobile && npx expo lint

##@ Utilities
reset-password: ## Reset a user's password — EMAIL=… PASSWORD=…
	@bash scripts/utils/reset_password.sh "$(EMAIL)" "$(PASSWORD)"

check-user: ## Show a user's Convex state (team_id, etc.) — EMAIL=…
	@bash scripts/utils/check_user.sh "$(EMAIL)"

assign-team: ## Force-assign a user to a team — EMAIL=… CODE=…
	@bash scripts/utils/assign_team.sh "$(EMAIL)" "$(CODE)"

screenshot: ## Capture a device screenshot — optional OUT=path/to/file.png
	@bash scripts/utils/screenshot.sh "$(OUT)"

##@ Maintenance
kill: ## Kill all dev processes and free ports 8000/8081
	@pkill -f "uvicorn" 2>/dev/null || true
	@pkill -f "convex dev" 2>/dev/null || true
	@pkill -f "expo start" 2>/dev/null || true
	@pkill -f "ngrok" 2>/dev/null || true
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8081 | xargs kill -9 2>/dev/null || true
	@echo "Done."

clean: kill ## Kill everything and remove node_modules, venv, caches
	rm -rf mobile/node_modules mobile/.expo
	rm -rf backend/.venv
	rm -f /tmp/ngrok-api.log
