# Load Testing Suite

Complete performance and load testing setup for Plant Health Monitoring Backend.

## 📁 Structure

```
load-tests/
├── baseline.yml                    # Normal load test
├── spike.yml                       # Traffic spike test
├── stress.yml                      # Stress test
├── realistic-scenario.yml          # Realistic user behavior
├── processors/                     # Custom request processors
│   ├── baselineProcessor.js
│   ├── spikeProcessor.js
│   ├── stressProcessor.js
│   └── realisticProcessor.js
├── reports/                        # Generated HTML reports
│   └── [test results]
├── run-load-tests.ps1             # Windows interactive runner
└── run-load-tests.sh              # Linux/Mac runner
```

## 📊 Test Scenarios

| Test          | Duration | Load Pattern      | Purpose             |
| ------------- | -------- | ----------------- | ------------------- |
| **Baseline**  | ~3 min   | 10 req/s steady   | Normal performance  |
| **Spike**     | ~5 min   | 5→25→30 req/s     | Spike recovery      |
| **Stress**    | ~6 min   | 5→75 req/s ramp   | Find breaking point |
| **Realistic** | ~10 min  | 3→15 req/s varied | Real user behavior  |

## 🚀 Quick Start

```bash
# Windows - Interactive menu
npm run load-test

# Quick 10-second test
npm run load-test:quick

# Individual tests
npm run load-test:baseline
npm run load-test:spike
npm run load-test:stress
npm run load-test:realistic
```

## 📖 Documentation

- **[LOAD_TESTING.md](../LOAD_TESTING.md)** - Complete guide with metrics, benchmarks, and troubleshooting
- **[LOAD_TESTING_QUICK_REFERENCE.md](../LOAD_TESTING_QUICK_REFERENCE.md)** - Quick command reference
- **[LOAD_TESTING_CONFIG.md](../LOAD_TESTING_CONFIG.md)** - Configuration and customization guide

## 💾 Reports

Test reports are generated in `load-tests/reports/` with timestamps:

```
baseline_2024-02-10_14-30-45.html
spike_2024-02-10_14-35-12.html
stress_2024-02-10_14-42-00.html
realistic-scenario_2024-02-10_14-55-30.html
```

Open any report in a browser to view:

- Response time charts
- Throughput graphs
- Error distribution
- Endpoint-by-endpoint metrics
- Request timeline

## 📋 Test Contents

### Baseline Test

Tests normal system load with steady traffic:

- 40% guest predictions
- 30% history queries
- 20% health checks
- 10% authentication flows

### Spike Test

Measures recovery from sudden traffic surges:

- Two separate spikes (5x load increase)
- Sustains spike load for 60 seconds
- Monitors error rates and response time degradation

### Stress Test

Finds system breaking point:

- Gradual load increase to 75 req/sec
- Extended high-load period
- Tracks when success rate drops below 95%

### Realistic Scenario

Simulates real user behavior patterns:

- Varies load throughout simulated day
- 5 different user types with authentic flows
- Think time between requests
- Mix of authenticated and guest users

## 🔧 Custom Processors

Each test includes a JavaScript processor that:

- Adds custom headers for tracking
- Logs slow responses
- Captures metrics
- Analyzes results
- Provides summary statistics

## ⚙️ Configuration

Tests can be customized by editing YAML files:

- Change `target` URL
- Adjust `phases` for different load patterns
- Modify `scenarios` for your endpoints
- Update `variables` with real test data

See [LOAD_TESTING_CONFIG.md](../LOAD_TESTING_CONFIG.md) for detailed configuration options.

## 🎯 Target Performance

```
Guest Prediction:  1000-1500ms (with AI inference)
History Query:     50-150ms
Auth Endpoint:     100-300ms
Health Check:      10-20ms

Success Rate:      > 99%
P95 Response:      < 2000ms
Error Rate:        < 1%
```

## 📦 Requirements

- Node.js 16+
- Artillery installed: `npm install --save-dev artillery`
- Backend server running on `http://localhost:5000`

## 🛠️ Troubleshooting

**Server not running?**

```bash
npm run dev
```

**Artillery not found?**

```bash
npm install --save-dev artillery
```

**Port in use?**

```bash
npm run dev  # In a different terminal
```

**High error rate?**
Check server logs and review error details in HTML report.

## 📚 More Information

- [Artillery Official Docs](https://artillery.io/docs)
- [Load Testing Best Practices](https://artillery.io/docs/guides/best-practices)
- Server logs: `logs/` directory
- Test configuration: Edit YAML files directly

## 📝 Next Steps

1. ✅ Ensure server is running
2. ✅ Run baseline test: `npm run load-test:baseline`
3. ✅ Review HTML report in `load-tests/reports/`
4. ✅ Note response times and success rates
5. ✅ Run other tests to compare
6. ✅ Identify slow endpoints in reports
7. ✅ Check server logs for errors
8. ✅ Optimize bottlenecks
9. ✅ Re-test to verify improvements
10. ✅ Schedule regular test runs

---

**For detailed information, see the main documentation files above.**
