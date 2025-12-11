# Z3 Solver Installation Guide

This guide provides platform-specific instructions for installing the Z3 theorem prover for **proof-of-thought**'s formal verification capabilities.

## Table of Contents

- [Overview](#overview)
- [Quick Install](#quick-install)
- [macOS Installation](#macos-installation)
- [Linux Installation](#linux-installation)
- [Windows Installation](#windows-installation)
- [Browser Installation](#browser-installation)
- [Docker Installation](#docker-installation)
- [Building from Source](#building-from-source)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Version Requirements](#version-requirements)

## Overview

Z3 is a high-performance theorem prover from Microsoft Research. **proof-of-thought** uses Z3 for formal verification of logical formulas.

### ⚡ TL;DR: Choose Your Z3 Installation

**proof-of-thought** supports both **native Z3** and **Z3 WASM**, with automatic fallback:

**Quick Install (Recommended for Performance):**
```bash
# macOS
brew install z3

# Linux (Ubuntu/Debian)
sudo apt-get install z3

# Windows
choco install z3
```

**Or Use WASM (Zero-Install):**
```bash
# WASM support included via z3-solver package (already a dependency)
# No additional installation needed!
```

### Installation Options

| Option | Performance | Setup | Use Case |
|--------|-------------|-------|----------|
| **Native Z3** | **Fastest** | Requires system installation | Production, performance-critical apps |
| **Z3 WASM** | 2-3x slower | Zero-install (npm only) | Development, browsers, quick prototyping |
| **Automatic** | Best available | No config needed | Default behavior (tries native → WASM) |

### Native vs WASM Tradeoffs

**Native Z3:**
- ✅ Fastest performance (baseline)
- ✅ Full SMT2 support
- ❌ Requires system-level installation
- ❌ Platform-specific binaries

**Z3 WASM:**
- ✅ Zero-install experience
- ✅ Works in browsers
- ✅ Cross-platform (JavaScript)
- ❌ 2-3x slower than native
- ✅ Full SMT2 support for common reasoning

### Automatic Fallback

The library automatically selects the best available adapter:

```typescript
// In Node.js: tries native → WASM → error
const adapter = await createZ3Adapter();

// In browsers: always uses WASM
const adapter = await createZ3Adapter();

// Prefer WASM even when native available (for consistent behavior)
const adapter = await createZ3Adapter({ preferWasm: true });
```

**Fallback order in Node.js:**
1. ✅ Try native Z3 (fastest)
2. ✅ Fall back to WASM if native unavailable
3. ❌ Error with installation instructions if both unavailable

## Quick Install

### Node.js (Recommended)

The easiest method is using the z3-solver npm package:

```bash
npm install z3-solver
```

This package includes:
- Pre-built Z3 binaries for major platforms
- JavaScript/TypeScript bindings
- Automatic platform detection

**Pros:**
- ✅ Cross-platform
- ✅ No system dependencies
- ✅ Version pinned
- ✅ Works out of the box

**Cons:**
- ❌ Larger package size (~50MB)
- ❌ May not be latest Z3 version

### proof-of-thought Installation

When you install **proof-of-thought**, z3-solver is included as a dependency:

```bash
npm install @michaelvanlaar/proof-of-thought
# z3-solver is automatically installed
```

## macOS Installation

### Method 1: Homebrew (Recommended)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Z3
brew install z3

# Verify installation
z3 --version
```

**Expected output:**
```
Z3 version 4.12.5 - 64 bit
```

### Method 2: MacPorts

```bash
# Install MacPorts from https://www.macports.org/

# Install Z3
sudo port install z3

# Verify
z3 --version
```

### Method 3: Download Binary

1. Visit [Z3 Releases](https://github.com/Z3Prover/z3/releases)
2. Download: `z3-4.12.5-x64-osx-11.7.10.zip`
3. Extract and add to PATH:

```bash
unzip z3-4.12.5-x64-osx-11.7.10.zip
sudo mv z3-4.12.5-x64-osx-11.7.10/bin/z3 /usr/local/bin/
chmod +x /usr/local/bin/z3

# Verify
z3 --version
```

### Method 4: Build from Source

```bash
# Install dependencies
brew install cmake python3

# Clone repository
git clone https://github.com/Z3Prover/z3.git
cd z3

# Build
python3 scripts/mk_make.py
cd build
make
sudo make install

# Verify
z3 --version
```

## Linux Installation

### Ubuntu/Debian

#### Method 1: APT (Easiest)

```bash
# Update package list
sudo apt-get update

# Install Z3
sudo apt-get install z3

# Verify
z3 --version
```

**Note:** APT version may be older. For latest version, use other methods.

#### Method 2: Download Binary

```bash
# Download latest release
wget https://github.com/Z3Prover/z3/releases/download/z3-4.12.5/z3-4.12.5-x64-glibc-2.35.zip

# Extract
unzip z3-4.12.5-x64-glibc-2.35.zip

# Move to system path
sudo mv z3-4.12.5-x64-glibc-2.35/bin/z3 /usr/local/bin/
sudo chmod +x /usr/local/bin/z3

# Verify
z3 --version
```

#### Method 3: Build from Source

```bash
# Install dependencies
sudo apt-get install build-essential cmake python3

# Clone repository
git clone https://github.com/Z3Prover/z3.git
cd z3

# Build
python3 scripts/mk_make.py
cd build
make
sudo make install

# Verify
z3 --version
```

### Fedora/RHEL/CentOS

```bash
# Fedora
sudo dnf install z3

# RHEL/CentOS (EPEL required)
sudo yum install epel-release
sudo yum install z3

# Verify
z3 --version
```

### Arch Linux

```bash
# Install Z3
sudo pacman -S z3

# Verify
z3 --version
```

### Alpine Linux

```bash
# Install Z3
apk add z3

# Verify
z3 --version
```

## Windows Installation

### Method 1: Chocolatey (Recommended)

```powershell
# Install Chocolatey from https://chocolatey.org/

# Install Z3
choco install z3

# Verify
z3 --version
```

### Method 2: Download Binary

1. Visit [Z3 Releases](https://github.com/Z3Prover/z3/releases)
2. Download: `z3-4.12.5-x64-win.zip`
3. Extract to a directory (e.g., `C:\Program Files\Z3`)
4. Add to PATH:

```powershell
# Open System Properties > Environment Variables
# Add C:\Program Files\Z3\bin to Path

# Or use PowerShell:
$env:Path += ";C:\Program Files\Z3\bin"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::User)

# Verify
z3 --version
```

### Method 3: Windows Subsystem for Linux (WSL)

If you have WSL installed:

```bash
# Inside WSL terminal
sudo apt-get update
sudo apt-get install z3
z3 --version
```

### Method 4: Build from Source

```powershell
# Install Visual Studio with C++ tools
# Install CMake and Python

# Clone repository
git clone https://github.com/Z3Prover/z3.git
cd z3

# Build
python scripts\mk_make.py
cd build
nmake

# Add to PATH manually
```

## Browser Installation

For browser environments, **proof-of-thought** uses Z3 compiled to WebAssembly (WASM).

### Automatic (Recommended)

**proof-of-thought** handles WASM loading automatically:

```typescript
import { ProofOfThought, Z3WASMAdapter } from '@michaelvanlaar/proof-of-thought/browser';

const z3Adapter = new Z3WASMAdapter({
  wasmUrl: 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm'
});

const pot = new ProofOfThought({
  client,
  z3Adapter,
});
```

### CDN Options

**jsDelivr (Recommended):**
```typescript
const wasmUrl = 'https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm';
```

**unpkg:**
```typescript
const wasmUrl = 'https://unpkg.com/z3-solver@4.12.2/build/z3-built.wasm';
```

**Local:**
```typescript
// Copy WASM file to public directory
const wasmUrl = '/z3-built.wasm';
```

### Manual WASM Setup

1. Download WASM build:
```bash
npm install z3-solver
cp node_modules/z3-solver/build/z3-built.wasm public/
```

2. Configure proof-of-thought:
```typescript
const z3Adapter = new Z3WASMAdapter({
  wasmUrl: '/z3-built.wasm',
  timeout: 30000,
  memory: {
    initial: 256,  // 16MB
    maximum: 512,  // 32MB
  },
});
```

### Browser Requirements

- Modern browser with WebAssembly support
- CORS headers configured (if serving WASM from different origin)
- Content Security Policy allowing WASM execution

## Docker Installation

### Official Z3 Docker Image

```dockerfile
FROM ubuntu:22.04

# Install Z3
RUN apt-get update && \
    apt-get install -y z3 && \
    rm -rf /var/lib/apt/lists/*

# Verify
RUN z3 --version
```

### With Node.js

```dockerfile
FROM node:18

# Install Z3
RUN apt-get update && \
    apt-get install -y z3 && \
    rm -rf /var/lib/apt/lists/*

# Install proof-of-thought
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy application
COPY . .

# Verify Z3
RUN z3 --version

CMD ["node", "app.js"]
```

### Using z3-solver Package

```dockerfile
FROM node:18

WORKDIR /app

# Install dependencies (includes z3-solver)
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "app.js"]
```

## Building from Source

### Prerequisites

- C++ compiler (GCC 4.8+, Clang 3.4+, or MSVC 2015+)
- Python 3.x
- CMake 3.4+

### Build Steps

```bash
# Clone repository
git clone https://github.com/Z3Prover/z3.git
cd z3

# Create build scripts
python3 scripts/mk_make.py

# Build
cd build
make -j$(nproc)  # Linux/Mac
nmake            # Windows

# Install (optional)
sudo make install  # Linux/Mac
```

### Build Options

```bash
# Debug build
python3 scripts/mk_make.py --debug

# Static build
python3 scripts/mk_make.py --staticlib

# Python bindings
python3 scripts/mk_make.py --python

# Java bindings
python3 scripts/mk_make.py --java
```

## Verification

### Test Z3 Installation

```bash
# Check version
z3 --version

# Test with simple formula
echo "(declare-const x Int) (assert (> x 0)) (check-sat)" | z3 -in
# Expected output: sat
```

### Test with proof-of-thought

```typescript
import { ProofOfThought } from '@michaelvanlaar/proof-of-thought';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pot = new ProofOfThought({ client });

async function testZ3() {
  try {
    const result = await pot.query(
      'Is 5 greater than 3?',
      '5 > 3'
    );

    if (result.isVerified) {
      console.log('✅ Z3 is working correctly!');
      console.log('Answer:', result.answer);
    }
  } catch (error) {
    console.error('❌ Z3 test failed:', error);
  }
}

testZ3();
```

### Check Z3 Adapter

```typescript
import { createZ3Adapter } from '@michaelvanlaar/proof-of-thought';

async function checkZ3() {
  const adapter = createZ3Adapter();

  // Initialize
  await adapter.initialize();

  // Check availability
  const available = await adapter.isAvailable();
  console.log('Z3 available:', available);

  // Get version
  const version = await adapter.getVersion();
  console.log('Z3 version:', version);

  // Test execution
  const formula = '(declare-const x Int) (assert (> x 0)) (check-sat)';
  const result = await adapter.executeSMT2(formula);
  console.log('Test result:', result.result);  // Should be 'sat'
}

checkZ3();
```

## Troubleshooting

### Z3 Not Found

**Problem:** `command not found: z3` or `Z3NotAvailableError`

**Solutions:**

1. **Check PATH:**
```bash
echo $PATH  # Linux/Mac
echo %PATH%  # Windows

# Find Z3
which z3  # Linux/Mac
where z3  # Windows
```

2. **Add Z3 to PATH:**
```bash
# Linux/Mac (.bashrc or .zshrc)
export PATH="/path/to/z3/bin:$PATH"

# Windows (PowerShell)
$env:Path += ";C:\path\to\z3\bin"
```

3. **Specify Z3 path in proof-of-thought:**
```typescript
const pot = new ProofOfThought({
  client,
  z3Path: '/usr/local/bin/z3',
});
```

### Version Mismatch

**Problem:** Incompatible Z3 version

**Solution:**
```bash
# Check version
z3 --version

# Should be 4.8.x or higher
# Recommended: 4.12.x

# Upgrade Z3
brew upgrade z3          # macOS
sudo apt-get upgrade z3  # Linux
choco upgrade z3         # Windows
```

### Permission Denied

**Problem:** Cannot execute Z3

**Solution:**
```bash
# Linux/Mac
chmod +x /path/to/z3

# Or run with sudo
sudo z3 --version
```

### WASM Loading Errors

**Problem:** Z3 WASM fails to load in browser

**Solutions:**

1. **Check CORS headers:**
```javascript
// Server must send:
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

2. **Check CSP policy:**
```html
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self' 'wasm-unsafe-eval';">
```

3. **Verify WASM URL:**
```typescript
// Test URL directly
fetch('https://cdn.jsdelivr.net/npm/z3-solver@4.12.2/build/z3-built.wasm')
  .then(r => console.log('WASM accessible:', r.ok))
  .catch(e => console.error('WASM error:', e));
```

### Build Errors

**Problem:** Compilation fails when building from source

**Solutions:**

1. **Install build dependencies:**
```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake python3

# macOS
xcode-select --install
brew install cmake
```

2. **Check compiler version:**
```bash
gcc --version  # Should be 4.8+
g++ --version
```

3. **Use specific Python version:**
```bash
python3 scripts/mk_make.py
# Not python2
```

## Version Requirements

### Minimum Requirements

- **Z3:** 4.8.0 or higher
- **Recommended:** 4.12.x (latest stable)

### Version Compatibility

| Z3 Version | Node.js | Browser | Status      |
|------------|---------|---------|-------------|
| 4.12.x     | ✅      | ✅      | Recommended |
| 4.11.x     | ✅      | ✅      | Supported   |
| 4.10.x     | ✅      | ⚠️      | Limited     |
| 4.8.x      | ✅      | ❌      | Minimum     |
| < 4.8      | ❌      | ❌      | Not supported|

### Check Your Version

```typescript
import { createZ3Adapter } from '@michaelvanlaar/proof-of-thought';

async function checkVersion() {
  const adapter = createZ3Adapter();
  await adapter.initialize();
  const version = await adapter.getVersion();

  console.log('Z3 version:', version);

  const [major, minor] = version.split('.').map(Number);

  if (major > 4 || (major === 4 && minor >= 12)) {
    console.log('✅ Z3 version is optimal');
  } else if (major === 4 && minor >= 8) {
    console.log('⚠️ Z3 version is supported but outdated');
    console.log('   Recommend upgrading to 4.12.x');
  } else {
    console.log('❌ Z3 version is too old');
    console.log('   Please upgrade to 4.12.x');
  }
}

checkVersion();
```

## Platform-Specific Notes

### macOS Apple Silicon (M1/M2)

Z3 runs natively on Apple Silicon:

```bash
# Install via Homebrew (ARM native)
brew install z3

# Verify architecture
file $(which z3)
# Should show: arm64
```

### Linux ARM

```bash
# Raspberry Pi / ARM devices
sudo apt-get install z3

# Or build from source
git clone https://github.com/Z3Prover/z3.git
cd z3
python3 scripts/mk_make.py
cd build
make
sudo make install
```

### Windows on ARM

Use WSL or build from source with ARM toolchain.

## Additional Resources

- **Z3 Homepage:** https://github.com/Z3Prover/z3
- **Z3 Releases:** https://github.com/Z3Prover/z3/releases
- **Z3 Documentation:** https://z3prover.github.io/
- **z3-solver npm:** https://www.npmjs.com/package/z3-solver
- **SMT-LIB:** http://smtlib.cs.uiowa.edu/

## Support

If you encounter Z3 installation issues:

1. Check this guide
2. Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Search [Z3 Issues](https://github.com/Z3Prover/z3/issues)
4. Open an issue: [ProofOfThought Issues](https://github.com/MichaelvanLaar/proof-of-thought/issues)

---

**Quick Reference:**

```bash
# macOS
brew install z3

# Ubuntu/Debian
sudo apt-get install z3

# Windows
choco install z3

# npm (all platforms)
npm install z3-solver

# Verify
z3 --version
```
