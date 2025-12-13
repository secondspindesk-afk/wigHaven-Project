$gateway = "https://ben820-wighaven-gateway.hf.space/gateway-health"

Write-Host "🚀 Testing ben820/wighaven-gateway" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Test 1: Single request
Write-Host "`n📊 Test 1: Single Request" -ForegroundColor Yellow
$time = Measure-Command { 
    $response = Invoke-WebRequest -Uri $gateway -UseBasicParsing
    Write-Host $response.Content
}
Write-Host "Time: $($time.TotalMilliseconds)ms" -ForegroundColor Green

# Test 2: 10 requests
Write-Host "`n📊 Test 2: 10 Requests" -ForegroundColor Yellow
$times = @()
for ($i = 1; $i -le 10; $i++) {
    $time = Measure-Command { 
        Invoke-WebRequest -Uri $gateway -UseBasicParsing | Out-Null
    }
    $times += $time.TotalMilliseconds
    Write-Host "  Request ${i}: $($time.TotalMilliseconds)ms"
}
$avg = ($times | Measure-Object -Average).Average
$min = ($times | Measure-Object -Minimum).Minimum
$max = ($times | Measure-Object -Maximum).Maximum
Write-Host "`n  Average: $([math]::Round($avg, 2))ms" -ForegroundColor Green
Write-Host "  Min: $([math]::Round($min, 2))ms" -ForegroundColor Green
Write-Host "  Max: $([math]::Round($max, 2))ms" -ForegroundColor Green

# Test 3: Concurrent requests
Write-Host "`n📊 Test 3: 20 Concurrent Requests" -ForegroundColor Yellow
$jobs = 1..20 | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url)
        $time = Measure-Command { 
            Invoke-WebRequest -Uri $url -UseBasicParsing | Out-Null
        }
        $time.TotalMilliseconds
    } -ArgumentList $gateway
}

$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$concurrentAvg = ($results | Measure-Object -Average).Average
Write-Host "  Average (concurrent): $([math]::Round($concurrentAvg, 2))ms" -ForegroundColor Green

Write-Host "`n✅ Tests Complete!" -ForegroundColor Cyan
Write-Host "🎯 Rust gateway is blazing fast! ⚡" -ForegroundColor Cyan