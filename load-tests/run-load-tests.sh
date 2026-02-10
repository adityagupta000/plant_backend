#!/bin/bash
# Load Test Runner Script (Bash/Shell version)
# This script provides an easy way to run different load test scenarios

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}"
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Artillery is installed
check_artillery() {
    if ! command -v artillery &> /dev/null; then
        print_error "Artillery is not installed. Please run: npm install --save-dev artillery"
        exit 1
    fi
    print_success "Artillery found"
}

# Check if server is running
check_server() {
    print_info "Checking if server is running on http://localhost:5000..."
    if ! curl -s http://localhost:5000/api/system/health > /dev/null 2>&1; then
        print_error "Server is not running on http://localhost:5000"
        print_info "Please start the server with: npm run dev"
        exit 1
    fi
    print_success "Server is running"
}

# Run a specific load test
run_test() {
    local test_name=$1
    local config_file=$2
    
    print_header "Running $test_name Test"
    print_info "Starting at: $(date)"
    
    local report_file="$REPORTS_DIR/${test_name}_${TIMESTAMP}.html"
    
    artillery quick --count 10 --num 100 "$config_file" > /tmp/artillery.txt 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "$test_name test completed"
        print_info "Report saved to: $report_file"
    else
        print_error "$test_name test failed"
        cat /tmp/artillery.txt
        exit 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Plant Health Backend - Load Testing   ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "Available Tests:"
    echo "  1. Baseline Test        - Normal load with steady traffic"
    echo "  2. Spike Test           - Sudden spike in traffic"
    echo "  3. Stress Test          - Continuous high load"
    echo "  4. Realistic Scenario   - Real user behavior patterns"
    echo "  5. Full Test Suite      - Run all tests"
    echo "  6. Results Summary      - Show previous test results"
    echo "  0. Exit"
    echo ""
    read -p "Select test (0-6): " choice
}

# Run baseline test
run_baseline() {
    run_test "baseline" "$SCRIPT_DIR/baseline.yml"
}

# Run spike test
run_spike() {
    run_test "spike" "$SCRIPT_DIR/spike.yml"
}

# Run stress test
run_stress() {
    run_test "stress" "$SCRIPT_DIR/stress.yml"
}

# Run realistic scenario
run_realistic() {
    run_test "realistic-scenario" "$SCRIPT_DIR/realistic-scenario.yml"
}

# Run all tests
run_all_tests() {
    print_header "Running Full Load Test Suite"
    run_baseline
    echo ""
    run_spike
    echo ""
    run_stress
    echo ""
    run_realistic
    print_success "All tests completed!"
}

# Show results summary
show_results() {
    print_header "Test Results Summary"
    if [ -z "$(ls -A "$REPORTS_DIR" 2>/dev/null)" ]; then
        print_info "No test reports found. Run a test first."
    else
        echo "Recent test reports:"
        ls -1t "$REPORTS_DIR" | head -10 | nl
    fi
}

# Main execution
main() {
    print_header "Load Testing Setup"
    check_artillery
    
    if [ "$1" != "skip-server-check" ]; then
        check_server
    fi
    
    while true; do
        show_menu
        case $choice in
            1) run_baseline ;;
            2) run_spike ;;
            3) run_stress ;;
            4) run_realistic ;;
            5) run_all_tests ;;
            6) show_results ;;
            0) 
                print_success "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
}

# Run main function
main "$@"
