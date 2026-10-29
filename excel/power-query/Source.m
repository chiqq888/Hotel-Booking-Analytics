let
    Path = Text.From(Excel.CurrentWorkbook(){[Name="cfgRawPath"]}[Content]{0}[Column1]),
    Workbook = Excel.Workbook(File.Contents(Path), null, true),
    Source = Workbook{[Item="tblRawBookings", Kind="Table"]}[Data]
in
    Source
