Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("assets\images\logo2.png")
$bmp = New-Object System.Drawing.Bitmap 300, ([math]::Round(($img.Height / $img.Width) * 300))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $bmp.Width, $bmp.Height)
$bmp.Save("assets\images\logo2_opt.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$img.Dispose()
