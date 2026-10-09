' Para o Apache e MySQL do XAMPP quando terminar de usar o sistema

Dim oShell
Set oShell = CreateObject("WScript.Shell")

oShell.Run "taskkill /f /im httpd.exe",    0, True
oShell.Run "taskkill /f /im mysqld.exe",   0, True

MsgBox "Sistema encerrado!" & Chr(13) & "Apache e MySQL foram parados.", 64, "Raiz & Pixel"

Set oShell = Nothing
