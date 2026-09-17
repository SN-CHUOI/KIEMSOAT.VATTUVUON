$Port = 8899
$RootDir = $PSScriptRoot

$mime = @{
    ".html"="text/html; charset=utf-8"; ".js"="application/javascript"; ".css"="text/css";
    ".xlsx"="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; ".json"="application/json"
}

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Start()
} catch {
    Write-Host "Khong the mo cong $Port. Co the cong nay dang duoc dung boi mot cua so khac." -ForegroundColor Red
    Write-Host "Dong het cac cua so 'MoCongCu' cu dang chay roi thu lai." -ForegroundColor Red
    Read-Host "Bam Enter de dong"
    exit
}

Write-Host "Da khoi dong. Dang mo trinh duyet..." -ForegroundColor Green
Start-Process "http://localhost:$Port/index.html"
Write-Host ""
Write-Host "GIU CUA SO NAY MO trong luc dung cong cu." -ForegroundColor Yellow
Write-Host "Dong cua so nay lai khi dung xong. (Bam Ctrl+C hoac dong X de tat)" -ForegroundColor Yellow
Write-Host ""

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
        $reqPath = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
        $reqPath = $reqPath.TrimStart('/')
        if ($reqPath -eq '') { $reqPath = 'index.html' }
        $full = Join-Path $RootDir $reqPath
        if (Test-Path $full -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $ctype = $mime[$ext]
            if (-not $ctype) { $ctype = "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ctx.Response.ContentType = $ctype
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $reqPath")
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
    } catch {
    } finally {
        $ctx.Response.OutputStream.Close()
    }
}
