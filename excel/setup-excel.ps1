[CmdletBinding()]
param([string]$ProjectRoot='',[double]$AdrReviewThreshold=1000,[switch]$Force)
$ErrorActionPreference='Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot=Split-Path $PSScriptRoot -Parent }
. (Join-Path $PSScriptRoot 'excel-common.ps1')
$ProjectRoot=[IO.Path]::GetFullPath($ProjectRoot)
$raw=Join-Path $ProjectRoot 'data/raw_data.xlsx'
$target=Join-Path $ProjectRoot 'data/analysis.xlsx'
if (-not (Test-Path -LiteralPath $raw)) { throw 'Missing data/raw_data.xlsx. Run npm run import first.' }
if ((Test-Path -LiteralPath $target) -and -not $Force) { throw 'analysis.xlsx already exists. Use refresh-excel.ps1; use -Force only to rebuild it.' }
$temporary=Join-Path $ProjectRoot ('data/analysis.build-'+[Guid]::NewGuid().ToString('N')+'.xlsx')
$excel=$null; $workbook=$null; $saved=$false
try {
    $excel=New-Object -ComObject Excel.Application
    $excel.Visible=$false; $excel.DisplayAlerts=$false; $excel.ScreenUpdating=$false
    $workbook=$excel.Workbooks.Add()
    while ($workbook.Worksheets.Count -gt 1) { $workbook.Worksheets.Item($workbook.Worksheets.Count).Delete() }
    $instructions=$workbook.Worksheets.Item(1); $instructions.Name='Instructions'
    Add-Title $instructions 'Hotel Booking Analytics' 'Excel + Power Query + Tableau Public | ข้อมูลประวัติศาสตร์สำหรับการเรียน'
    $notes=@(
        '1. ปิด raw_data.xlsx ก่อนเพิ่มรายการผ่านเว็บ; Backend บันทึกเฉพาะ raw_data.xlsx',
        '2. เปลี่ยนพาธที่ Config!B5 เมื่อย้ายเครื่อง แล้วรัน excel/refresh-excel.ps1',
        '3. Query โหลด FactBookings, Dimensions, DataQuality, Statistics และ MonthlySummary จริง',
        '4. Forecast ใช้ original / Check-Out / วันเข้าพักรายเดือน; holdout 3 เดือนเต็มท้าย',
        '5. boundary_complete ตรวจขอบช่วงจากวันที่ต่ำสุด/สูงสุด; ต้องยืนยันความครบกับแหล่งข้อมูลด้วย',
        '6. WhatIf ใช้ Excel Goal Seek จริง สมมติราคาคงที่ ไม่รวมภาษี ต้นทุน หรือความจุ',
        '7. Dashboard ต้อง Refresh Extract และ Publish ทับบน Tableau Public ด้วยผู้ใช้',
        '8. Total Bookings นับ booking_id; Cancellation Rate ใช้ is_canceled=1 รวม No-Show ตามต้นฉบับ',
        '9. Average ADR เฉลี่ยต่อ booking ที่ ADR>=0; ไม่ถ่วงคืน; ไม่ตัด outlier สูงออก',
        '10. Revenue เป็น ADR × valid total_nights เฉพาะ Check-Out เป็นประมาณการ ไม่ใช่รายได้บัญชี',
        '11. จำนวนคืนรวมเป็นคืนที่บันทึกใน booking ไม่ใช่จำนวนห้องหรือ occupancy',
        '12. country/children ที่หายไม่แทนด้วยศูนย์; key ที่หายใช้ __MISSING__; ไม่ deduplicate แถว',
        'Dataset: https://www.kaggle.com/datasets/jessemostipak/hotel-booking-demand',
        'Original study: https://doi.org/10.1016/j.dib.2018.11.126',
        'Queries.Add: https://learn.microsoft.com/en-us/office/vba/api/excel.queries.add',
        'GoalSeek: https://learn.microsoft.com/en-us/office/vba/api/excel.range.goalseek'
    )
    for ($r=0;$r -lt $notes.Count;$r++) { $instructions.Range('A'+($r+5)+':H'+($r+5)).Merge(); Set-Cell $instructions ($r+5) 1 $notes[$r]; $instructions.Rows.Item($r+5).RowHeight=30 }
    $instructions.Range('A5:H20').WrapText=$true
    $config=$workbook.Worksheets.Add([Type]::Missing,$instructions); $config.Name='Config'
    Add-Title $config 'Config' 'ช่องสีน้ำเงินเป็น input ที่เปลี่ยนได้; พาธถูกเติมอัตโนมัติโดยสคริปต์เมื่อย้ายเครื่อง'
    Set-Cell $config 5 1 'Raw workbook path'; Set-Cell $config 5 2 $raw
    Set-Cell $config 6 1 'ADR review threshold'; Set-Cell $config 6 2 $AdrReviewThreshold
    Set-Cell $config 8 1 'Analysis source'; Set-Cell $config 8 2 'original'
    Set-Cell $config 9 1 'Forecast holdout'; Set-Cell $config 9 2 3.0
    Set-Cell $config 10 1 'Boundary model policy'; Set-Cell $config 10 2 'Exclude first/last original months conservatively'
    $config.Range('B5:B6').Font.Color=0xC06020; $config.Columns.Item('B').ColumnWidth=80; $config.Columns.Item('A').ColumnWidth=28
    [void]$workbook.Names.Add('cfgRawPath','=Config!$B$5')
    [void]$workbook.Names.Add('cfgAdrReviewThreshold','=Config!$B$6')
    foreach ($name in @('Source','Cleansing','FactBookings','FactSnapshot','DataQuality','DimHotel','DimRoom','DimCountry','DimCustomerType','DimDate','MonthlySummary','Statistics','ModelChecks')) {
        $formula=Get-Content -LiteralPath (Join-Path $PSScriptRoot ('power-query/'+$name+'.m')) -Raw -Encoding UTF8
        [void]$workbook.Queries.Add($name,$formula,'Hotel Booking Analytics reproducible query')
    }
    # Saving first gives the Mashup provider a stable workbook context.
    $workbook.SaveAs($temporary,51)
    foreach ($spec in @(@('FactBookings','FactBookings','tblFactBookings'),@('DimHotel','DimHotel','tblDimHotel'),@('DimRoom','DimRoom','tblDimRoom'),@('DimCountry','DimCountry','tblDimCountry'),@('DimCustomerType','DimCustomerType','tblDimCustomerType'),@('DimDate','DimDate','tblDimDate'),@('DataQuality','DataQuality','tblDataQuality'),@('Statistics','Statistics','tblStatistics'),@('MonthlySummary','MonthlySummary','tblMonthlySummary'),@('ModelChecks','ModelChecks','tblModelChecks'))) {
        $null=Add-QueryTable $workbook $spec[0] $spec[1] $spec[2]
    }
    $forecast=$workbook.Worksheets.Add([Type]::Missing,$workbook.Worksheets.Item($workbook.Worksheets.Count)); $forecast.Name='Forecast'
    $whatif=$workbook.Worksheets.Add([Type]::Missing,$forecast); $whatif.Name='WhatIf'
    Add-Title $whatif 'What-if: จำนวนคืนที่ต้องขาย' 'สมมติราคาต่อคืนคงที่; ไม่รวมต้นทุน ภาษี ความจุห้องพัก และผลจากการเปลี่ยนราคา'
    $labels=@{5='ราคาเฉลี่ยต่อคืนที่สมมติ';6='รายรับเป้าหมายที่สมมติ';7='จำนวนคืน (Goal Seek เปลี่ยนเซลล์นี้)';8='รายรับจำลอง = ราคา × คืน';9='จำนวนคืนปัดขึ้นเพื่อวางแผน';10='รายรับหลังปัดคืนขึ้น';11='ผล Goal Seek'}
    foreach ($r in $labels.Keys) { Set-Cell $whatif $r 1 $labels[$r] }
    Set-Cell $whatif 5 2 100.0; Set-Cell $whatif 6 2 100000.0; Set-Cell $whatif 7 2 1.0
    $whatif.Range('B8').Formula='=B5*B7'; $whatif.Range('B9').Formula='=ROUNDUP(B7,0)'; $whatif.Range('B10').Formula='=B5*B9'
    $whatif.Range('B5:B7').Font.Color=0xC06020; $whatif.Range('B5:B10').NumberFormat='#,##0.00'
    $whatif.Columns.Item('A').ColumnWidth=47; $whatif.Columns.Item('B').ColumnWidth=32
    Wait-ExcelRefresh $excel $workbook
    Build-Forecast $excel $workbook
    Run-GoalSeek $excel $workbook
    Assert-Model $workbook
    foreach ($sheet in $workbook.Worksheets) { $sheet.Activate(); $excel.ActiveWindow.DisplayGridlines=$false; $excel.ActiveWindow.SplitRow=4; $excel.ActiveWindow.FreezePanes=$true; $sheet.Range('A1').Select() | Out-Null }
    $instructions.Activate()
    $workbook.Save()
    Export-Verification $workbook $ProjectRoot
    Export-TableauCsv $workbook $ProjectRoot
    $workbook.Close($false); $workbook=$null
    Move-Item -LiteralPath $temporary -Destination $target -Force
    $saved=$true
    Write-Host 'Created data/analysis.xlsx with native queries, forecasts and Goal Seek. Verification: excel/verification.json'
} finally {
    if ($null -ne $workbook) { try { $workbook.Close($false) } catch { Write-Warning 'Owned Excel workbook was already closed.' } }
    if ($null -ne $excel) { try { $excel.Quit() } catch { Write-Warning 'Owned Excel instance was already closed.' }; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    if (-not $saved -and (Test-Path -LiteralPath $temporary)) { Remove-Item -LiteralPath $temporary -Force }
}
