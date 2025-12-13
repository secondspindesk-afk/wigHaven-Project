#!/usr/bin/env python3
"""
HuggingFace Space Deployment Script
Restart or factory-rebuild HuggingFace Spaces from CLI

Usage:
  python hf_deploy.py restart backend    # Restart backend space
  python hf_deploy.py restart gateway    # Restart gateway space  
  python hf_deploy.py restart all        # Restart all spaces
  python hf_deploy.py rebuild backend    # Factory rebuild (clears cache)

Requires: pip install huggingface_hub
"""

import sys
from huggingface_hub import HfApi

# Your HuggingFace username
HF_USERNAME = "ben820"

# Space names (repo_id format: username/space-name)
SPACES = {
    "backend": f"{HF_USERNAME}/wighaven-backend",
    "gateway": f"{HF_USERNAME}/wighaven-gateway",
}

def restart_space(api: HfApi, space_id: str):
    """Restart a space (soft restart)"""
    print(f"🔄 Restarting {space_id}...")
    try:
        api.restart_space(space_id)
        print(f"✅ {space_id} restart triggered!")
    except Exception as e:
        print(f"❌ Failed to restart {space_id}: {e}")

def rebuild_space(api: HfApi, space_id: str):
    """Factory rebuild a space (clears cache, full rebuild)"""
    print(f"🏭 Factory rebuilding {space_id}...")
    try:
        api.restart_space(space_id, factory_reboot=True)
        print(f"✅ {space_id} factory rebuild triggered!")
    except Exception as e:
        print(f"❌ Failed to rebuild {space_id}: {e}")

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1].lower()  # restart or rebuild
    target = sys.argv[2].lower()  # backend, gateway, or all

    api = HfApi()

    if target == "all":
        targets = list(SPACES.keys())
    elif target in SPACES:
        targets = [target]
    else:
        print(f"❌ Unknown target: {target}")
        print(f"Available: {', '.join(SPACES.keys())}, all")
        sys.exit(1)

    for t in targets:
        space_id = SPACES[t]
        if action == "restart":
            restart_space(api, space_id)
        elif action == "rebuild":
            rebuild_space(api, space_id)
        else:
            print(f"❌ Unknown action: {action}")
            print("Available: restart, rebuild")
            sys.exit(1)

if __name__ == "__main__":
    main()
