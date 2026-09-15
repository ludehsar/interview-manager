#set page(paper: "us-letter", margin: (x: 0.6in, y: 0.55in))
#set text(font: "Inter", size: 10pt, lang: "en")
#set par(justify: false, leading: 0.55em)
#set list(indent: 0.9em, body-indent: 0.4em, marker: [•])
#show heading.where(level: 1): it => block(above: 0.9em, below: 0.45em)[
  #text(size: 10.5pt, weight: "bold", tracking: 0.5pt, upper(it.body))
  #v(-0.55em)
  #line(length: 100%, stroke: 0.5pt + rgb("#333333"))
]
