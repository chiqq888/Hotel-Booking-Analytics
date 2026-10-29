[CmdletBinding()]
param([string]$ProjectRoot='',[switch]$ApplyFormatting)
$ErrorActionPreference='Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot=Split-Path $PSScriptRoot -Parent }
. (Join-Path $PSScriptRoot 'excel-common.ps1')
$ProjectRoot=[IO.Path]::GetFullPath($ProjectRoot)
$path=Join-Path $ProjectRoot 'data/analysis.xlsx'
$out=Join-Path $ProjectRoot 'docs/excel-review'
[void][IO.Directory]::CreateDirectory($out)
$excel=$null; $workbook=$null
try {
    $excel=New-Object -ComObject Excel.Application
    $excel.Visible=$false; $excel.DisplayAlerts=$false
    $workbook=$excel.Workbooks.Open($path,0,(-not $ApplyFormatting))
    if ($ApplyFormatting) {
        if ($workbook.ReadOnly) { throw 'analysis.xlsx is locked; formatting was not saved.' }
        foreach ($sheet in $workbook.Worksheets) { foreach ($table in $sheet.ListObjects) { Format-DataTable $sheet $table } }
        $workbook.Save()
    }
    Export-TableauCsv $workbook $ProjectRoot
    foreach ($sheet in $workbook.Worksheets) {
        $sheet.PageSetup.Orientation=2
        $sheet.PageSetup.PaperSize=8
        $sheet.PageSetup.Zoom=$false
        $sheet.PageSetup.FitToPagesWide=1
        $sheet.PageSetup.FitToPagesTall=1
        $sheet.PageSetup.LeftMargin=$excel.InchesToPoints(0.25)
        $sheet.PageSetup.RightMargin=$excel.InchesToPoints(0.25)
        $lastColumn=[Math]::Min(12,$sheet.UsedRange.Columns.Count)
        $lastRow=[Math]::Min(20,$sheet.UsedRange.Rows.Count)
        if ($sheet.Name -eq 'Forecast') { $lastColumn=17; $lastRow=32 }
        if ($sheet.Name -eq 'WhatIf') { $lastColumn=8; $lastRow=13 }
        $sheet.PageSetup.PrintArea=$sheet.Range($sheet.Cells.Item(1,1),$sheet.Cells.Item($lastRow,$lastColumn)).Address()
        $sheet.ExportAsFixedFormat(0,(Join-Path $out ($sheet.Name+'.pdf')),0,$true,$false)
    }
    Write-Host 'Exported genuine native Excel worksheet previews to docs/excel-review.'
    if ($ApplyFormatting) { Write-Host 'Native table formatting saved; queries and formula values preserved.' } else { Write-Host 'Read-only workbook was not saved.' }
} finally {
    if ($null -ne $workbook) { $workbook.Close($false) }
    if ($null -ne $excel) { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
