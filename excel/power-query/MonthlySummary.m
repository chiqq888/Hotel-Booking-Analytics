let
    F = Table.Buffer(FactSnapshot),
    Dates = List.RemoveNulls(Table.SelectRows(F,each [data_source]="original")[arrival_date]),
    FirstDate = List.Min(Dates), LastDate = List.Max(Dates),
    FirstMonth = Date.StartOfMonth(FirstDate), LastMonth = Date.StartOfMonth(LastDate),
    Months = List.Generate(()=>FirstMonth,each _<=LastMonth,each Date.AddMonths(_,1)),
    Groups = Table.Distinct(Table.SelectColumns(F,{"hotel","data_source"})),
    Grid = Table.ExpandListColumn(Table.AddColumn(Groups,"month_start",each Months),"month_start"),
    Counts = Table.Group(Table.SelectRows(F,each [month_start]<>null),{"hotel","data_source","month_start"},{{"total_bookings",each Table.RowCount(_),Int64.Type},{"completed_stays",each Table.RowCount(Table.SelectRows(_,each [reservation_status]="Check-Out")),Int64.Type},{"canceled_bookings",each Table.RowCount(Table.SelectRows(_,each [is_canceled]=1)),Int64.Type},{"total_nights_all",each List.Sum(List.RemoveNulls([total_nights])),type nullable number},{"estimated_lodging_revenue",each List.Sum(List.RemoveNulls([estimated_lodging_revenue])),type nullable number},{"average_adr_per_booking",each let v=Table.SelectRows(_,each [adr_valid]=true)[adr] in if List.IsEmpty(v) then null else List.Average(v),type nullable number},{"adr_valid_count",each Table.RowCount(Table.SelectRows(_,each [adr_valid]=true)),Int64.Type}}),
    // Union keeps web observations outside the historical period; original calendar is never silently shortened.
    AllKeys = Table.Distinct(Table.Combine({Grid,Table.SelectColumns(Counts,{"hotel","data_source","month_start"})})),
    Joined = Table.NestedJoin(AllKeys,{"hotel","data_source","month_start"},Counts,{"hotel","data_source","month_start"},"s",JoinKind.LeftOuter),
    Expanded = Table.ExpandTableColumn(Joined,"s",{"total_bookings","completed_stays","canceled_bookings","total_nights_all","estimated_lodging_revenue","average_adr_per_booking","adr_valid_count"}),
    ZeroCounts = Table.ReplaceValue(Expanded,null,0,Replacer.ReplaceValue,{"total_bookings","completed_stays","canceled_bookings","adr_valid_count"}),
    Rate = Table.AddColumn(ZeroCounts,"cancellation_rate",each if [total_bookings]=0 then null else [canceled_bookings]/[total_bookings],type nullable number),
    Full = Table.AddColumn(Rate,"boundary_complete",each [month_start]>=FirstMonth and [month_start]<=LastMonth and ([month_start]<>FirstMonth or FirstDate=FirstMonth) and ([month_start]<>LastMonth or LastDate=Date.EndOfMonth(LastDate)),type logical),
    // Conservative policy: observations on day 1/last day do not prove full coverage.
    Eligible = Table.AddColumn(Full,"model_eligible_month",each [data_source]="original" and [boundary_complete] and [month_start]>FirstMonth and [month_start]<LastMonth,type logical),
    Typed = Table.TransformColumnTypes(Eligible,{{"month_start",type date},{"total_bookings",Int64.Type},{"completed_stays",Int64.Type},{"canceled_bookings",Int64.Type}}),
    Result = Table.Sort(Typed,{{"data_source",Order.Ascending},{"hotel",Order.Ascending},{"month_start",Order.Ascending}})
in Result
