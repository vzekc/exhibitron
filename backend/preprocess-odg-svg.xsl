<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns="http://www.w3.org/2000/svg"
                xpath-default-namespace="http://www.w3.org/2000/svg">

  <!-- we might want to remove the strip-space and the indent at some point -->
  <xsl:output method="xml" indent="yes"/>
  <xsl:strip-space elements="*"/>
  <xsl:mode on-no-match="shallow-copy"/>

  <xsl:template match="g[preceding-sibling::title[matches(text(), '^\s*table\s*$')]]">
    <xsl:variable name="table-number" select="normalize-space(.//tspan[matches(text(), '\d+')]/text())"/>
    <g id="table_{$table-number}">
      <xsl:apply-templates select="*"/>
    </g>
  </xsl:template>

</xsl:stylesheet>
