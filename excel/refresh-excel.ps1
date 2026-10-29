[CmdletBinding()]
param([string]$ProjectRoot='')
$ErrorActionPreference='Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot=Split-Path $PSScriptRoot -Parent }
. (Join-Path $PSScriptRoot 'excel-common.ps1')
$ProjectRoot=[IO.Path]::GetFullPath($ProjectRoot)
$path=Join-Path $ProjectRoot 'data/analysis.xlsx'; $raw=Join-Path $ProjectRoot 'data/raw_data.xlsx'
if (-not (Test-Path -LiteralPath $path)) { throw 'Missing analysis.xlsx. Run setup-excel.ps1 first.' }
if (-not (Test-Path -LiteralPath $raw)) { throw 'Missing raw_data.xlsx. Run npm run import first.' }
$excel=$null; $workbook=$null
try {
    $excel=New-Object -ComObject Excel.Application
    $excel.Visible=$false; $excel.DisplayAlerts=$false; $excel.ScreenUpdating=$false
    $workbook=$excel.Workbooks.Open($path,0,$false)
    if ($workbook.ReadOnly) { throw 'analysis.xlsx is locked. Close this workbook in Excel/Tableau, then retry.' }
    $workbook.Worksheets.Item('Config').Range('B5').Value2=$raw
    # Reload versioned M sources so corrections travel with the reproducible project.
    foreach ($queryFile in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'power-query') -Filter '*.m') {
        $name=$queryFile.BaseName
        $formula=Get-Content -LiteralPath $queryFile.FullName -Raw -Encoding UTF8
        $existing=$null
        foreach ($query in $workbook.Queries) { if ($query.Name -eq $name) { $existing=$query; break } }
        if ($null -ne $existing) { $existing.Formula=$formula } else { [void]$workbook.Queries.Add($name,$formula) }
    }
    # Refresh each dependent table synchronously; async completion is checked again before saving.
    foreach ($name in @('FactBookings','DimHotel','DimRoom','DimCountry','DimCustomerType','DimDate','DataQuality','Statistics','MonthlySummary','ModelChecks')) {
        $sheet=$workbook.Worksheets.Item($name)
        foreach ($query in $sheet.QueryTables) { Write-Host ('Refreshing '+$sheet.Name); $query.BackgroundQuery=$false; try { $query.CommandTimeout=900 } catch { }; $ok=$query.Refresh($false); if (-not $ok) { throw ('Power Query refresh was canceled: '+$sheet.Name) } }
    }
    Wait-ExcelRefresh $excel $workbook
    Build-Forecast $excel $workbook
    Run-GoalSeek $excel $workbook
    Assert-Model $workbook
    $workbook.Save()
    Export-Verification $workbook $ProjectRoot
    Export-TableauCsv $workbook $ProjectRoot
    Write-Host 'Refresh, calculation and native Goal Seek completed and saved. Refresh Extract and Publish in Tableau Public next.'
} finally {
    if ($null -ne $workbook) { try { $workbook.Close($false) } catch { Write-Warning 'Owned Excel workbook was already closed.' } }
    if ($null -ne $excel) { try { $excel.Quit() } catch { Write-Warning 'Owned Excel instance was already closed.' }; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
