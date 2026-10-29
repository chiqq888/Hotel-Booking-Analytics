Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Set-Cell($Sheet,[int]$Row,[int]$Column,$Value) {
    # Separate typed call sites avoid PowerShell COM coercing a later Double
    # through a string setter. Numeric values remain native Excel numbers.
    $cell=$Sheet.Cells.Item($Row,$Column)
    if ($Value -is [ValueType]) { $cell.Value2=[double]$Value }
    else { $cell.Value2=[string]$Value }
}
function Add-Title($Sheet,[string]$Title,[string]$Subtitle) {
    $Sheet.Cells.Font.Name = 'Aptos'
    $Sheet.Cells.Font.Size = 11
    $Sheet.Range('A1:H1').Merge()
    Set-Cell $Sheet 1 1 $Title
    $Sheet.Range('A1:H1').Font.Size = 20
    $Sheet.Range('A1:H1').Font.Bold = $true
    $Sheet.Range('A1:H1').Font.Color = 0x5C4630
    $Sheet.Rows.Item(1).RowHeight = 32
    $Sheet.Range('A2:H2').Merge()
    Set-Cell $Sheet 2 1 $Subtitle
    $Sheet.Range('A2:H2').WrapText = $true
    $Sheet.Rows.Item(2).RowHeight = 36
    $Sheet.Columns.Item('A:H').ColumnWidth = 18
}
function Format-DataTable($Sheet,$Table) {
    $Table.TableStyle = 'TableStyleMedium2'
    $sampleRows=[Math]::Min(101,$Table.Range.Rows.Count)
    $Sheet.Range($Table.Range.Cells.Item(1,1),$Table.Range.Cells.Item($sampleRows,$Table.ListColumns.Count)).Columns.AutoFit() | Out-Null
    foreach ($column in $Sheet.UsedRange.Columns) {
        if ($column.ColumnWidth -gt 36) { $column.ColumnWidth = 36 }
        if ($column.ColumnWidth -lt 12) { $column.ColumnWidth = 12 }
    }
    $Table.HeaderRowRange.WrapText = $true
    $Table.HeaderRowRange.RowHeight = 36
    foreach ($column in $Table.ListColumns) {
        $name = [string]$column.Name
        if ($null -eq $column.DataBodyRange) { continue }
        if ($name -match '(^arrival_date$|_date_typed$|^month_start$|^date_key$|^first_arrival$|^last_arrival$|^inferred_booking_date$)') { $column.DataBodyRange.NumberFormat = 'yyyy-mm-dd' }
        elseif ($name -match '(_count$|^total_bookings$|^completed_stays$|^canceled_bookings$|^total_nights_all$|^holdout_months$|^train_months$|^mape_zero_actual_excluded$|^planned_stays$|^time_index$)') { $column.DataBodyRange.NumberFormat = '#,##0' }
        elseif ($name -match '^cancellation_rate$|^mape$|^ape$') { $column.DataBodyRange.NumberFormat = '0.0%' }
        elseif ($name -match 'adr|revenue|predicted|error|^mae$') { $column.DataBodyRange.NumberFormat = '#,##0.00' }
    }
}
function Add-QueryTable($Workbook,[string]$Query,[string]$SheetName,[string]$TableName) {
    Write-Host "Loading Power Query: $Query"
    $sheet = $Workbook.Worksheets.Add([Type]::Missing,$Workbook.Worksheets.Item($Workbook.Worksheets.Count))
    $sheet.Name = $SheetName
    $connection = 'OLEDB;Provider=Microsoft.Mashup.OleDb.1;Data Source=$Workbook$;Location=' + $Query + ';Extended Properties=""'
    $table = $sheet.ListObjects.Add(0,$connection,$true,1,$sheet.Range('A4'))
    $table.Name = $TableName
    $table.QueryTable.CommandType = 2
    $table.QueryTable.CommandText = 'SELECT * FROM [' + $Query + ']'
    $table.QueryTable.BackgroundQuery = $false
    try { $table.QueryTable.CommandTimeout=900 } catch { Write-Host 'Mashup provider uses its native query timeout.' }
    $timer=[Diagnostics.Stopwatch]::StartNew()
    $refreshSucceeded=$table.QueryTable.Refresh($false)
    if (-not $refreshSucceeded) { throw ('Power Query refresh was canceled: '+$Query) }
    Write-Host ('Refreshed '+$Query+' rows='+$table.ListRows.Count+' seconds='+[Math]::Round($timer.Elapsed.TotalSeconds,1))
    Add-Title $sheet $Query 'ข้อมูลจาก Power Query: เปลี่ยนต้นทางที่ Config แล้วใช้ refresh-excel.ps1'
    Format-DataTable $sheet $table
    Write-Host ('Formatted '+$Query)
    return $table
}
function Wait-ExcelRefresh($Excel,$Workbook) {
    $Excel.CalculateUntilAsyncQueriesDone()
    $deadline = (Get-Date).AddMinutes(15)
    do {
        $pending = $false
        foreach ($sheet in $Workbook.Worksheets) {
            foreach ($query in $sheet.QueryTables) { if ($query.Refreshing) { $pending = $true } }
        }
        if (-not $pending -and $Excel.CalculationState -eq 0) { break }
        if ((Get-Date) -gt $deadline) { throw 'Excel refresh timed out; workbook was not saved.' }
        Start-Sleep -Milliseconds 300
    } while ($true)
}
function Build-Forecast($Excel,$Workbook) {
    $sheet = $Workbook.Worksheets.Item('Forecast')
    while ($sheet.ListObjects.Count -gt 0) { $sheet.ListObjects.Item(1).Delete() }
    $sheet.Cells.Clear() | Out-Null
    Add-Title $sheet 'Forecast: จำนวน Check-Out รายเดือน' 'original เท่านั้น; holdout 3 เดือนเต็มท้าย; เส้นตรงไม่อธิบายฤดูกาล; ค่าพยากรณ์อ้างอิงช่วงประวัติศาสตร์'
    $headers = @('hotel','month_start','time_index','role','actual','predicted','error','absolute_error','ape','planned_stays')
    for ($c=0;$c -lt $headers.Count;$c++) { Set-Cell $sheet 4 ($c+1) $headers[$c] }
    $monthly = $Workbook.Worksheets.Item('MonthlySummary').ListObjects.Item('tblMonthlySummary')
    $values = $monthly.DataBodyRange.Value2
    $index = @{}
    for ($c=1;$c -le $monthly.ListColumns.Count;$c++) { $index[[string]$monthly.ListColumns.Item($c).Name]=$c }
    $groups = @{}
    for ($r=1;$r -le $monthly.ListRows.Count;$r++) {
        if ([string]($values.GetValue($r,$index['data_source'])) -ne 'original') { continue }
        $isComplete = $values.GetValue($r,$index['model_eligible_month'])
        if (-not ($isComplete -eq $true -or [string]$isComplete -eq 'TRUE')) { continue }
        $hotel = [string]($values.GetValue($r,$index['hotel']))
        if (-not $groups.ContainsKey($hotel)) { $groups[$hotel]=[Collections.Generic.List[object]]::new() }
        $groups[$hotel].Add([pscustomobject]@{ month=[double]($values.GetValue($r,$index['month_start'])); actual=[double]($values.GetValue($r,$index['completed_stays'])); sourceRow=$r+4 })
    }
    $row = 5
    $metricRows = [Collections.Generic.List[object]]::new()
    foreach ($hotel in ($groups.Keys | Sort-Object)) {
        $series = @($groups[$hotel] | Sort-Object month)
        if ($series.Count -lt 6) { throw "Forecast needs at least 6 full historical months for $hotel." }
        $first = $row; $trainEnd = $row+$series.Count-4; $actualEnd=$row+$series.Count-1; $holdStart=$trainEnd+1
        for ($i=0;$i -lt $series.Count;$i++) {
            $period = $series[$i]
            Set-Cell $sheet $row 1 $hotel
            $monthColumn=$index['month_start']
            $monthLetter=$monthly.Parent.Cells.Item(1,$monthColumn).Address($false,$false).TrimEnd('1')
            $sheet.Cells.Item($row,2).Formula = '=MonthlySummary!' + $monthLetter + $period.sourceRow
            Set-Cell $sheet $row 3 ([double]($i+1))
            Set-Cell $sheet $row 4 $(if ($row -le $trainEnd) { 'train' } else { 'holdout' })
            $actualColumn = $index['completed_stays']
            $sheet.Cells.Item($row,5).Formula = '=MonthlySummary!' + $monthly.Parent.Cells.Item(1,$actualColumn).Address($false,$false).TrimEnd('1') + $period.sourceRow
            if ($row -gt $trainEnd) {
                $sheet.Cells.Item($row,6).Formula = '=FORECAST.LINEAR(C'+$row+',E$'+$first+':E$'+$trainEnd+',C$'+$first+':C$'+$trainEnd+')'
                $sheet.Cells.Item($row,7).Formula = '=E'+$row+'-F'+$row
                $sheet.Cells.Item($row,8).Formula = '=ABS(G'+$row+')'
                $sheet.Cells.Item($row,9).Formula = '=IF(E'+$row+'=0,"",H'+$row+'/E'+$row+')'
                $sheet.Cells.Item($row,10).Formula = '=MAX(0,ROUND(F'+$row+',0))'
            }
            $row++
        }
        # Future begins after the DATASET end, even if its boundary month was excluded.
        $lastOriginal = 0.0
        for ($r=1;$r -le $monthly.ListRows.Count;$r++) {
            if ([string]($values.GetValue($r,$index['data_source'])) -eq 'original') { $lastOriginal=[Math]::Max($lastOriginal,[double]($values.GetValue($r,$index['month_start']))) }
        }
        $lastMonth = [DateTime]::FromOADate($lastOriginal)
        $baseMonth = [DateTime]::FromOADate([double]$series[0].month)
        for ($h=1;$h -le 3;$h++) {
            $future=$lastMonth.AddMonths($h)
            Set-Cell $sheet $row 1 $hotel
            Set-Cell $sheet $row 2 $future.ToOADate()
            Set-Cell $sheet $row 3 ([double](($future.Year-$baseMonth.Year)*12+$future.Month-$baseMonth.Month+1))
            Set-Cell $sheet $row 4 'future'
            $sheet.Cells.Item($row,6).Formula = '=FORECAST.LINEAR(C'+$row+',E$'+$first+':E$'+$actualEnd+',C$'+$first+':C$'+$actualEnd+')'
            $sheet.Cells.Item($row,10).Formula = '=MAX(0,ROUND(F'+$row+',0))'
            $row++
        }
        $metricRows.Add([pscustomobject]@{ hotel=$hotel; holdStart=$holdStart; actualEnd=$actualEnd; trainCount=$series.Count-3 })
    }
    $table = $sheet.ListObjects.Add(1,$sheet.Range('A4:J'+($row-1)),$null,1)
    $table.Name='tblForecast'; Format-DataTable $sheet $table
    $sheet.Range('B5:B'+($row-1)).NumberFormat='yyyy-mm-dd'
    $metricHeaders=@('hotel','mae','mape','holdout_months','mape_zero_actual_excluded','train_months')
    for ($c=0;$c -lt $metricHeaders.Count;$c++) { Set-Cell $sheet 4 ($c+12) $metricHeaders[$c] }
    $mr=5
    foreach ($m in $metricRows) {
        Set-Cell $sheet $mr 12 $m.hotel
        $sheet.Cells.Item($mr,13).Formula='=AVERAGE(H'+$m.holdStart+':H'+$m.actualEnd+')'
        $sheet.Cells.Item($mr,14).Formula='=IF(COUNT(I'+$m.holdStart+':I'+$m.actualEnd+')=0,"",AVERAGE(I'+$m.holdStart+':I'+$m.actualEnd+'))'
        Set-Cell $sheet $mr 15 ([double]3)
        $sheet.Cells.Item($mr,16).Formula='=COUNTIF(E'+$m.holdStart+':E'+$m.actualEnd+',0)'
        Set-Cell $sheet $mr 17 ([double]$m.trainCount)
        $mr++
    }
    $metricTable=$sheet.ListObjects.Add(1,$sheet.Range('L4:Q'+($mr-1)),$null,1)
    $metricTable.Name='tblForecastMetrics'; Format-DataTable $sheet $metricTable
    $sheet.Range('N5:N'+($mr-1)).NumberFormat='0.0%'
    $Excel.CalculateFull()
}
function Run-GoalSeek($Excel,$Workbook) {
    $sheet=$Workbook.Worksheets.Item('WhatIf')
    $price=$sheet.Range('B5').Value2; $target=$sheet.Range('B6').Value2
    if ($null -eq $price -or $null -eq $target -or [double]$price -le 0 -or [double]$target -lt 0) { throw 'WhatIf: price must be positive and target must be nonnegative.' }
    Set-Cell $sheet 7 2 1.0
    $Excel.CalculateFull()
    $ok=$sheet.Range('B8').GoalSeek([double]$target,$sheet.Range('B7'))
    Set-Cell $sheet 11 2 $(if ($ok) { 'สำเร็จ (Excel Goal Seek)' } else { 'ไม่สำเร็จ' })
    $Excel.CalculateFull()
    if (-not $ok -or [Math]::Abs([double]$sheet.Range('B8').Value2-[double]$target) -gt [Math]::Max(0.01,[double]$target*0.000001)) { throw 'Native Excel Goal Seek did not converge.' }
}
function Assert-Model($Workbook) {
    $checks=$Workbook.Worksheets.Item('ModelChecks').ListObjects.Item('tblModelChecks')
    foreach ($row in $checks.ListRows) {
        if ([double]$row.Range.Cells.Item(1,2).Value2 -ne 0) { throw ('Model check failed: '+$row.Range.Cells.Item(1,1).Value2) }
    }
    $forecast=$Workbook.Worksheets.Item('Forecast')
    foreach ($cell in $forecast.UsedRange.Cells) {
        if ([string]$cell.Text -match '^#(REF!|DIV/0!|VALUE!|NAME\?|N/A|NUM!|NULL!|SPILL!|CALC!)$') { throw ('Excel formula error at Forecast!'+$cell.Address()) }
    }
}
function Export-Verification($Workbook,[string]$Root) {
    $result=[ordered]@{ checked_at_utc=[DateTime]::UtcNow.ToString('o'); engine='Microsoft Excel Desktop COM'; query_count=$Workbook.Queries.Count; tables=@{}; statistics=@(); forecast_metrics=@(); goal_seek=@{} }
    foreach ($sheet in $Workbook.Worksheets) { foreach ($table in $sheet.ListObjects) { $result.tables[$table.Name]=$table.ListRows.Count } }
    foreach ($spec in @(@('Statistics','tblStatistics','statistics'),@('Forecast','tblForecastMetrics','forecast_metrics'))) {
        $table=$Workbook.Worksheets.Item($spec[0]).ListObjects.Item($spec[1]); $rows=@()
        foreach ($row in $table.ListRows) {
            $record=[ordered]@{}
            for ($i=1;$i -le $table.ListColumns.Count;$i++) { $record[[string]$table.ListColumns.Item($i).Name]=$row.Range.Cells.Item(1,$i).Value2 }
            $rows+=,$record
        }
        $result[$spec[2]]=$rows
    }
    $whatif=$Workbook.Worksheets.Item('WhatIf')
    $result.goal_seek=@{ price=$whatif.Range('B5').Value2; target=$whatif.Range('B6').Value2; nights=$whatif.Range('B7').Value2; revenue=$whatif.Range('B8').Value2; rounded_nights=$whatif.Range('B9').Value2; rounded_revenue=$whatif.Range('B10').Value2; status=$whatif.Range('B11').Value2 }
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Root 'excel/verification.json') -Encoding UTF8
}
function Export-TableauCsv($Workbook,[string]$Root) {
    $out=Join-Path $Root 'tableau/import'
    [void][IO.Directory]::CreateDirectory($out)
    # Small summary/forecast exports only. Detailed FactBookings stays in analysis.xlsx.
    foreach ($spec in @(@('Statistics','tblStatistics'),@('MonthlySummary','tblMonthlySummary'),@('Forecast','tblForecast'),@('Forecast','tblForecastMetrics'))) {
        $table=$Workbook.Worksheets.Item($spec[0]).ListObjects.Item($spec[1])
        $records=[Collections.Generic.List[object]]::new()
        foreach ($row in $table.ListRows) {
            $record=[ordered]@{}
            for ($i=1;$i -le $table.ListColumns.Count;$i++) {
                $name=[string]$table.ListColumns.Item($i).Name
                $value=$row.Range.Cells.Item(1,$i).Value2
                if ($name -eq 'month_start' -and $null -ne $value) { $value=[DateTime]::FromOADate([double]$value).ToString('yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture) }
                $record[$name]=$value
            }
            $records.Add([pscustomobject]$record)
        }
        $records | Export-Csv -LiteralPath (Join-Path $out ($spec[1]+'.csv')) -NoTypeInformation -Encoding UTF8
    }
}
