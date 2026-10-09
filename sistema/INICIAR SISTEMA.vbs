' ╔══════════════════════════════════════════╗
' ║   Raiz & Pixel — Iniciar Sistema         ║
' ║   Duplo clique para abrir o sistema      ║
' ╚══════════════════════════════════════════╝

Dim oShell
Set oShell = CreateObject("WScript.Shell")

Dim xamppPath : xamppPath = "C:\xampp"

' ── Parar processos anteriores se existirem ──────────────────
oShell.Run "taskkill /f /im httpd.exe",  0, True
oShell.Run "taskkill /f /im mysqld.exe", 0, True
WScript.Sleep 1000

' ── Iniciar MySQL (oculto) ───────────────────────────────────
Dim mysqlCmd
mysqlCmd = """" & xamppPath & "\mysql\bin\mysqld.exe"" --defaults-file=""" & xamppPath & "\mysql\bin\my.ini"" --standalone"
oShell.Run mysqlCmd, 0, False
WScript.Sleep 2000

' ── Iniciar Apache (oculto) ──────────────────────────────────
oShell.Run """" & xamppPath & "\apache\bin\httpd.exe""", 0, False
WScript.Sleep 2500

' ── Abrir sistema no navegador ───────────────────────────────
oShell.Run "http://localhost/sistema/app.html"

Set oShell = Nothing
