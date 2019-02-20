#! /usr/local/bin/php

<?php

  //  This code works: it tells how many h2 elements there are in an application form
  /*  Now, you have to pick out the name, dept, etc info. Use xpath? */

  $xml = simplexml_load_file($argv[1]);
  $domnode = dom_import_simplexml($xml);
  $dom = new DOMDocument();
  $domnode = $dom->importNode($domnode, true);
  $dom->appendChild($domnode);

  echo "There are ".$dom->getElementsByTagName('h2')->length." <h2> elements\n";
?>

