#!/bin/bash
# Quick Z3 installer for proof-of-thought testing

set -e

echo "========================================="
echo "  Z3 Theorem Prover Installation"
echo "========================================="
echo ""

# Check if Z3 is already installed
if command -v z3 &> /dev/null; then
    echo "✅ Z3 is already installed!"
    z3 --version
    echo ""
    echo "Testing Z3..."
    echo "(declare-const x Int) (assert (> x 0)) (check-sat)" | z3 -in
    echo ""
    echo "If you see 'sat' above, Z3 is working correctly."
    exit 0
fi

echo "Z3 not found. Installing..."
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -f /etc/debian_version ]; then
        echo "Detected: Ubuntu/Debian"
        echo "Running: sudo apt-get update && sudo apt-get install -y z3"
        echo ""
        sudo apt-get update
        sudo apt-get install -y z3
    elif [ -f /etc/fedora-release ]; then
        echo "Detected: Fedora"
        echo "Running: sudo dnf install -y z3"
        echo ""
        sudo dnf install -y z3
    elif [ -f /etc/arch-release ]; then
        echo "Detected: Arch Linux"
        echo "Running: sudo pacman -S z3"
        echo ""
        sudo pacman -S --noconfirm z3
    else
        echo "Unknown Linux distribution"
        echo "Please install Z3 manually: https://github.com/Z3Prover/z3/releases"
        exit 1
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected: macOS"
    if command -v brew &> /dev/null; then
        echo "Running: brew install z3"
        echo ""
        brew install z3
    else
        echo "Homebrew not found. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
else
    echo "Unsupported OS: $OSTYPE"
    echo "Please install Z3 manually: https://github.com/Z3Prover/z3/releases"
    exit 1
fi

echo ""
echo "========================================="
echo "  Installation Complete!"
echo "========================================="
echo ""
echo "Z3 version:"
z3 --version
echo ""
echo "Testing Z3..."
echo "(declare-const x Int) (assert (> x 0)) (check-sat)" | z3 -in
echo ""
echo "✅ Z3 is ready to use!"
echo ""
echo "You can now run: npx tsx examples/basic-usage.ts"
