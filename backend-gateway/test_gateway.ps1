# Gateway Comparison Test Script
# Tests both Cloudflare Worker and Rust/HuggingFace gateways

$gateways = @{
    "Cloudflare Worker" = "https://wighaven-gateway.secondspindesk.workers.dev/gateway-health"
    "Rust (HuggingFace)" = "https://ben820-wighaven-gateway.hf.space/gateway-health"
}

function Test-Gateway($name, $url) {
    Write-Host "`n🚀 Testing: $name" -ForegroundColor Cyan
    Write-Host "   URL: $url" -ForegroundColor DarkGray
    Write-Host "=====================================" -ForegroundColor Cyan

    # Test 1: Single request
    Write-Host "`n📊 Test 1: Single Request" -ForegroundColor Yellow
    try {
        $time = Measure-Command { 
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
            Write-Host "   $($response.Content)" -ForegroundColor Gray
        }
        Write-Host "   Time: $($time.TotalMilliseconds)ms" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }

    # Test 2: 10 requests
    Write-Host "`n📊 Test 2: 10 Sequential Requests" -ForegroundColor Yellow
    $times = @()
    for ($i = 1; $i -le 10; $i++) {
        try {
            $time = Measure-Command { 
                Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 | Out-Null
            }
            $times += $time.TotalMilliseconds
            Write-Host "   Request ${i}: $($time.TotalMilliseconds)ms"
        } catch {
            Write-Host "   Request ${i}: FAILED" -ForegroundColor Red
        }
    }
    
    if ($times.Count -gt 0) {
        $avg = ($times | Measure-Object -Average).Average
        $min = ($times | Measure-Object -Minimum).Minimum
        $max = ($times | Measure-Object -Maximum).Maximum
        Write-Host "`n   Average: $([math]::Round($avg, 2))ms" -ForegroundColor Green
        Write-Host "   Min: $([math]::Round($min, 2))ms" -ForegroundColor Green
        Write-Host "   Max: $([math]::Round($max, 2))ms" -ForegroundColor Green
        return $avg
    }
    return $null
}

# Run tests for each gateway
$results = @{}
foreach ($gateway in $gateways.GetEnumerator()) {
    $avg = Test-Gateway $gateway.Key $gateway.Value
    if ($avg) {
        $results[$gateway.Key] = $avg
    }
}

# Summary comparison
Write-Host "`n`n📊 COMPARISON SUMMARY" -ForegroundColor Magenta
Write-Host "=====================" -ForegroundColor Magenta

$sorted = $results.GetEnumerator() | Sort-Object Value
$fastest = $sorted | Select-Object -First 1

foreach ($result in $sorted) {
    $diff = if ($result.Name -eq $fastest.Name) { " 🏆 FASTEST" } else { " (+$([math]::Round($result.Value - $fastest.Value, 2))ms)" }
    Write-Host "  $($result.Name): $([math]::Round($result.Value, 2))ms$diff" -ForegroundColor $(if ($result.Name -eq $fastest.Name) { "Green" } else { "Yellow" })
}

Write-Host "`n✅ Tests Complete!" -ForegroundColor Cyan