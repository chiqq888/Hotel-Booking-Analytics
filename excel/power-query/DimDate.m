let
    Dates = List.RemoveNulls(FactSnapshot[arrival_date]),
    FirstDate = Date.StartOfMonth(List.Min(Dates)),
    LastDate = Date.EndOfMonth(List.Max(Dates)),
    Days = List.Dates(FirstDate,Duration.Days(LastDate-FirstDate)+1,#duration(1,0,0,0)),
    Base = Table.FromList(Days,Splitter.SplitByNothing(),{"date_key"}),
    Typed = Table.TransformColumnTypes(Base,{{"date_key",type date}}),
    Year = Table.AddColumn(Typed,"year",each Date.Year([date_key]),Int64.Type),
    Month = Table.AddColumn(Year,"month_number",each Date.Month([date_key]),Int64.Type),
    Result = Table.AddColumn(Month,"month_start",each Date.StartOfMonth([date_key]),type date)
in Result
