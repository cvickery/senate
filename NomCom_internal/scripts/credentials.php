<?php
//  $Id: credentials.php,v 1.1 2009/12/28 05:44:03 vickery Exp vickery $
/*  Opens a connection to the senate db 
 *
 *    $Log: credentials.php,v $
 *    Revision 1.1  2009/12/28 05:44:03  vickery
 *    Initial revision
 *
 *
 */

  $senate_db = pg_connect("dbname=senate user=vickery password=dobre337")
  or die("Unable to connect to database");
?>
