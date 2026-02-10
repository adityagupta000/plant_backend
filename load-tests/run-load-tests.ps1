# Load Test Runner Script (PowerShell version)
# Simple and reliable version that works with npm

# Get script directory (works when called from npm)
$ScriptDir = if ($PSScriptRoot) { 
    $PSScriptRoot 
} else { 
    Get-Location 
}

$ReportsDir = Join-Path $ScriptDir "reports"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Ensure reports directory exists
if (-not (Test-Path $ReportsDir)) {
    New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

function Test-Artillery {
    try {
        $null = artillery --version 2>$null
        Write-Success "Artillery found"
        return $true
    } catch {
        Write-Error "Artillery is not installed. Run: npm install --save-dev artillery"
        return $false
    }
}

function Test-Server {
    Write-Info "Checking if server is running on http://localhost:5000..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/system/health" `
            -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Server is running"
            return $true
        }
    } catch {
        Write-Error "Server is not running on http://localhost:5000"
        Write-Info "Please start the server with: npm run dev"
        return $false
    }
}

# ============================================================================
# TEST RUNNER FUNCTION
# ============================================================================

function Run-LoadTest {
    param(
        [string]$TestName,
        [string]$ConfigFile
    )
    
    Write-Header "Running $TestName Test"
    Write-Info "Starting at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    if (-not (Test-Path $ConfigFile)) {
        Write-Error "Configuration file not found: $ConfigFile"
        return $false
    }
    
    try {
        # Run artillery
        & artillery run --output (Join-Path $ReportsDir "${TestName}_${Timestamp}.html") $ConfigFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$TestName test completed"
            Write-Info "Report saved to: $ReportsDir"
            return $true
        } else {
            Write-Error "$TestName test failed with exit code: $LASTEXITCODE"
            return $false
        }
    } catch {
        Write-Error "Failed to run $TestName test: $_"
        return $false
    }
}

# ============================================================================
# INDIVIDUAL TEST FUNCTIONS
# ============================================================================

function Run-BaselineTest {
    Run-LoadTest "baseline" (Join-Path $ScriptDir "baseline.yml")
}

function Run-SpikeTest {
    Run-LoadTest "spike" (Join-Path $ScriptDir "spike.yml")
}

function Run-StressTest {
    Run-LoadTest "stress" (Join-Path $ScriptDir "stress.yml")
}

function Run-RealisticScenario {
    Run-LoadTest "realistic-scenario" (Join-Path $ScriptDir "realistic-scenario.yml")
}

function Run-AllTests {
    Write-Header "Running Full Load Test Suite"
    Write-Info "This will run all 4 tests. Estimated time: 30-45 minutes"
    $confirm = Read-Host "Continue? (y/n)"
    
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Info "Test cancelled"
        return
    }
    
    Write-Host ""
    Run-BaselineTest
    Write-Host ""
    Run-SpikeTest
    Write-Host ""
    Run-StressTest
    Write-Host ""
    Run-RealisticScenario
    
    Write-Success "All tests completed!"
}

function Show-ResultsSummary {
    Write-Header "Test Results Summary"
    
    if (-not (Test-Path $ReportsDir) -or (Get-ChildItem $ReportsDir -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
        Write-Info "No test reports found. Run a test first."
    } else {
        Write-Host "Recent test reports:" -ForegroundColor Cyan
        Get-ChildItem -Path $ReportsDir -File | Sort-Object LastWriteTime -Descending | 
            Select-Object -First 10 | 
            ForEach-Object -Begin { $i = 1 } -Process { 
                Write-Host "  $i. $($_.Name)" 
                $i++
            }
        Write-Host ""
        Write-Info "Open any .html file in your browser to view detailed results"
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "Plant Health Backend - Load Testing" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available Tests:"
    Write-Host "  1. Baseline Test        - Normal load with steady traffic"
    Write-Host "  2. Spike Test           - Sudden spike in traffic"
    Write-Host "  3. Stress Test          - Continuous high load"
    Write-Host "  4. Realistic Scenario   - Real user behavior patterns"
    Write-Host "  5. Full Test Suite      - Run all tests"
    Write-Host "  6. Results Summary      - Show previous test results"
    Write-Host "  0. Exit"
    Write-Host ""
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

function Main {
    param(
        [string]$Test = "",
        [switch]$SkipServerCheck = $false
    )
    
    Write-Header "Load Testing Setup"
    
    # Check Artillery
    if (-not (Test-Artillery)) {
        exit 1
    }
    
    # Check server (unless skipped)
    if (-not $SkipServerCheck) {
        if (-not (Test-Server)) {
            exit 1
        }
    }
    
    # If test parameter provided, run it directly and exit
    if ($Test) {
        switch ($Test.ToLower()) {
            "baseline" { Run-BaselineTest }
            "spike" { Run-SpikeTest }
            "stress" { Run-StressTest }
            "realistic" { Run-RealisticScenario }
            "all" { Run-AllTests }
            "results" { Show-ResultsSummary }
            default { 
                Write-Error "Unknown test: $Test"
                Write-Info "Available tests: baseline, spike, stress, realistic, all, results"
            }
        }
        return
    }
    
    # Interactive menu mode
    while ($true) {
        Show-Menu
        $choice = Read-Host "Select test"
        
        switch ($choice) {
            "1" { Run-BaselineTest }
            "2" { Run-SpikeTest }
            "3" { Run-StressTest }
            "4" { Run-RealisticScenario }
            "5" { Run-AllTests }
            "6" { Show-ResultsSummary }
            "0" { 
                Write-Success "Exiting..."
                exit 0
            }
            default { 
                Write-Error "Invalid option. Please try again."
            }
        }
        
        Write-Host ""
        Read-Host "Press Enter to continue"
        Clear-Host
    }
}

# ============================================================================
# RUN
# ============================================================================

# Get parameters from command line
$Test = $args[0]
$SkipServerCheck = $args -contains '-SkipServerCheck'

# Run main function
Main -Test $Test -SkipServerCheck:$SkipServerCheck
