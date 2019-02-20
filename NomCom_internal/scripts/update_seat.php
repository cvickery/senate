<?php
//  $Id: update_seat.php,v 1.10 2010/08/30 05:35:20 vickery Exp vickery $
/*  Updates the holder of a seat.
 *
 *    $Log: update_seat.php,v $
 *    Revision 1.10  2010/08/30 05:35:20  vickery
 *    Added support for resignation of either the regular or pro-tem
 *    seat holder when a seat has a pro-tem seat holder.
 *
 *    Revision 1.9  2010/01/09 23:36:53  vickery
 *    Implemented chair-change events: current chair resigns as chair but not
 *    from the committee; committee elects a chair when there was none; one
 *    person elected to replace another as chair.
 *
 *    Revision 1.8  2010/01/08 06:12:02  vickery
 *    Remove chair status and update committees table when the
 *    chair of a committee vacates a seat.
 *
 *    Revision 1.7  2009/12/31 22:10:55  vickery
 *    Change in whitespace of the code.
 *
 *    Revision 1.6  2009/12/29 05:24:26  vickery
 *    Whitespace and bug fixes.
 *    Restrict administrative access to administrators.
 *
 *    Revision 1.5  2009/11/02 21:04:00  vickery
 *    Implemented renewals.
 *
 *    Revision 1.4  2009/11/02 00:46:12  vickery
 *    Whitespace cleanup.
 *
 *    Revision 1.3  2009/11/02 00:41:49  vickery
 *    Implemented graduation, resignation, and departure events.
 *    Bug fixes, including recording the person who vacates a
 *    seat for procedural reasons.
 *
 *    Revision 1.2  2009/11/01 04:47:46  vickery
 *    Implemented pro-tem and procedural updates.
 *    Still need to do graduations and other departures.
 *
 *    Revision 1.1  2009/09/10 02:27:11  vickery
 *    Initial revision
 *
 */
  session_start();
  header("Cache-Control: no-cache");
  header("Expires: 0");

//  check_person_seat_constraint()
//  ----------------------------------------------------------------------------------------------------------
/*  Throws an exception if a person does not satisfy the constraints on who may occupy a seat.
 */
  function check_person_seat_constraint($person, $seat)
  {
    foreach (array_keys($seat) as $seat_key)
    {
      if (preg_match('/(is_.*)_seat/', $seat_key, $matches))
      {
        $person_key = $matches[1];
        if ( (($seat[$seat_key] === 't') && ($person[$person_key] === 'f')) &&
            //  Allow graduate students to sit on any student seat except UCC/USS
             ! (($seat_key === 'is_undergraduate_student_seat') && ($person['is_graduate_student'] === 't') &&
                (substr($committees[$seat['committee_id']], 0, 5) !== 'Under' ))
           )
        {
          $seat_key = preg_replace('/_/', ' ', $seat_key);
          throw new Exception($seat_key . " constraint not met");
        }
      }
    }
  }

  //  Be sure user has logged in.
  if (!isset($_SESSION['person']) || !($_SESSION['person']['is_db_admin'] === 't'))
  {
    header( "Location: scripts/do_logoff.php");
  }

  //  Get the request object
  if (isset($_GET['request']))
  {
    $request_object = json_decode($_GET['request']);
    try
    {
      $today = new DateTime();
      $one_year = new DateInterval("P1Y");
      $one_year_ago = date_sub(new DateTime(), $one_year);
      $conn = pg_connect("dbname=senate user=vickery");
      pg_query($conn, "BEGIN"); // Transaction: both the seat_events and the seats tables have to be updated
      $seat_result = pg_query($conn, "SELECT * FROM seats WHERE id = {$request_object->seat_id}");
      $seat = pg_fetch_assoc($seat_result);
      $seat_expiration_date = new DateTime($seat['expiration_date']);
      $committee_result = pg_query($conn, "SELECT id, name FROM committees");
      $committees = array();
      while ($committee = pg_fetch_Assoc($committee_result)) $committees[$committee['id']] = $committee['name'];
      switch ($request_object->event_type)
      {
        case 'election':
            //  Check if the seat is open
            if ($seat['person_id'] !== "1") throw new Exception("Error: attempt to elect someone to an occupied seat.");
            $person_result = pg_query($conn, "SELECT * FROM people WHERE id = {$request_object->person_id}");
            $person = pg_fetch_assoc($person_result);

            //  Check if the person is of the correct type for the seat
            check_person_seat_constraint($person, $seat);

            //  Check if the election date is sane
            $election_date = new DateTime($request_object->election_date);
            if ($election_date > $today) throw new Exception("Election date in future.");
            if ($election_date < $one_year_ago) throw new Exception("Election date over one year ago.");

            //  Insert the event record
            $columns = 'seat_id, person_id, is_election, event_date, operator_id';
            $values = "{$request_object->seat_id}";
            $values .= ", {$request_object->person_id}";
            $values .= ", 't'";
            $values .= ", '{$request_object->election_date}'::date";
            $values .= ", {$_SESSION['person']['id']}";
            $event_query = "INSERT INTO seat_events ($columns) VALUES ($values)";
            $result = pg_query($conn, $event_query);
            //  Assert: one event was inserted successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_events = pg_affected_rows($result);
            if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            //  Update the seat
            $values  = "  person_id={$request_object->person_id}";
            $values .= ", election_date='{$request_object->election_date}'::date";
            $seats_query = "UPDATE seats set {$values} WHERE id = {$request_object->seat_id}";
            $result = pg_query($conn, $seats_query);
            //  Assert: one seat was updated successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_seats = pg_affected_rows($result);
            if (1 !== $num_seats) throw new Exception("Attempt to update {$num_seats} seats.".$seats_query);
            pg_query($conn, "COMMIT");
            echo "OK";
            break;
        case 'renewal':
            //  Assert: the seat is actually occupied by the indicated person
            if ($seat['person_id'] !== $request_object->person_id)
                                      throw new Exception("Error: attempt to renew for wrong person");
            //  Assert: renewal date is sane
            $renewal_date = new DateTime($request_object->renewal_date);
            if ($renewal_date < $one_year_ago) throw new Exception("Renewal date over one year ago.");
            if ($renewal_date > $today) throw new Exception("Renewal date in the future");
            //  Create the event record
            $columns = 'seat_id, person_id, is_renewal, event_date, operator_id';
            $values = "{$request_object->seat_id}";
            $values .= ", {$request_object->person_id}";
            $values .= ", 't'";
            $values .= ", '{$request_object->renewal_date}'::date";
            $values .= ", {$_SESSION['person']['id']}";
            $event_query = "INSERT INTO seat_events ($columns) VALUES ($values)";
            $result = pg_query($conn, $event_query);
            //  Assert: one event was inserted successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_events = pg_affected_rows($result);
            if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            //  Update the seat
            $values  = "  person_id={$request_object->person_id}";
            $values .= ", renewal_received='t'";
            $result = pg_query($conn, "UPDATE seats set {$values} WHERE id = {$request_object->seat_id}");
            //  Assert: one seat was updated successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_seats = pg_affected_rows($result);
            if (1 !== $num_seats) throw new Exception("Attempt to update {$num_seats} seats.");
            pg_query($conn, "COMMIT");
            echo "OK";
            break;
        case 'departure':
        case 'graduation':
        case 'resignation':
          //  Check that the seat is actually occupied and that the vacancy date is sane.
            if ($seat['person_id'] === "1") throw new Exception("Error: attempt to vacate an open seat.");

            //  Assert: one person is vacating the seat
            $result = pg_query($conn, 
                     "SELECT person_id, pro_tem_person_id FROM seats WHERE id={$request_object->seat_id}");
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_rows = pg_num_rows($result);
            if (1 != $num_rows) throw new Exception("{$num_rows} seats with id {$request_object->seat_id}");
            //  Capture the regular seat holder and pro-tem seat holder ids for doing the updating.
            $current_seat_holders = pg_fetch_assoc($result);

            //  Check vacancy date
            $vacancy_date = new DateTime($request_object->vacancy_date);
            if ($vacancy_date < $one_year_ago) throw new Exception("Vacancy date over one year ago.");
            if ($vacancy_date > $today) throw new Exception("Vacancy date in the future");

            //  Check chair vacancy
            /*  TODO This does not take into account if a pro-tem seat holder resigns while sitting in the
             *  chair's seat: the original seat holder will still be chair. More significantly, if the
             *  regular seat holder resigns, the pro-tem seat holder will be un-chaired. Sort of, because
             *  the chair_id never got set to the pro-tem seat holder's id when he or she became a pro-tem
             *  seat holder, did it? As it says above, "TODO." But the web interface provides mechanisms for
             *  fixing things up. Sigh. */
            $is_chair_change_value  = 'f';
            $chair_query = "SELECT committees.id as \"committee_id\" FROM committees, people "
              . "WHERE committees.chair_id = people.id AND committees.name = '{$request_object->committee_name}' "
              . "AND people.id = {$request_object->person_id}";
            $chair_result = pg_query($conn, $chair_query);
            switch (pg_num_rows($chair_result))
            {
              case 0:
                break;
              case 1:
                $row = pg_fetch_assoc($chair_result);
                $update_query = "UPDATE committees SET chair_id = null WHERE id = {$row['committee_id']}";
                $update_result = pg_query($conn, $update_query);
                $num = pg_affected_rows($update_result);
                if ($num !==1 ) die("Attempt to remove $num chairs from {$request_object->committee_name}");
                $is_chair_change_value = 't';
                break;
              default:
                throw new Exception("Multiple committees named {$request_object->committee_name}");
                break;
            }

            //  Insert the event record
            $columns = "seat_id, person_id, is_{$request_object->event_type}, is_chair_change, event_date, operator_id";
            $values = "{$request_object->seat_id}";
            $values .= ", {$request_object->person_id}";
            $values .= ", 't', '$is_chair_change_value'";
            $values .= ", '{$request_object->vacancy_date}'::date";
            $values .= ", {$_SESSION['person']['id']}";
            $event_query = "INSERT INTO seat_events ($columns) VALUES ($values)";
            $result = pg_query($conn, $event_query);
            //  Assert: one event was inserted successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_events = pg_affected_rows($result);
            if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            //  Update the seat
            /*  Three possibilities:
             *    1. The regular seat holder resigned and there is no pro-tem to take over.
             *    2. The pro-tem holder resigned, and the seat reverts to the regular holder.
             *    3. The regular seat holder resigned and there is a pro-tem who takes over.
             */
            $regular_resigned = 
                       ($request_object->person_id === $current_seat_holders['person_id']) ? 1 : 0;
            $pro_tem_exists   = ($current_seat_holders['pro_tem_person_id'] !== null) ? 2 : 0;
            switch ($regular_resigned + $pro_tem_exists)
            {
              case 0: //  Regular didn't resign and there is no pro-tem
                throw new Exception("Nobody resigned at " . __LINE__);
              case 1: //  Regular resigned and there is no pro-tem
                $values = " person_id = 1, election_date='{$request_object->vacancy_date}'::date";
                break;
              case 2: //  Pro-tem exists and regular did not resign
                //  Assert: the pro-tem is resigning
                if ($request_object->person_id !== $current_seat_holders['pro_tem_person_id'])
                {
                  throw new Exception('Person resigning is neither the seat holder nor the pro-tem holder');
                }
                $values = "pro_tem_person_id = null, pro_tem_expiration_date = null";
                break;
              case 3: //  Regular resigned but there is a pro-tem
                $values = "person_id = {$current_seat_holders['pro_tem_person_id']}, "
                        . "pro_tem_person_id = null, pro_tem_expiration_date = null";
                break;
            }
            $result = pg_query($conn, "UPDATE seats set {$values} WHERE id = {$request_object->seat_id}");
            //  Assert: one seat was updated successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_seats = pg_affected_rows($result);
            if (1 !== $num_seats) throw new Exception("Attempt to update {$num_seats} seats.");
            pg_query($conn, "COMMIT");
            echo "OK";
            break;

        case 'chair-change':
          /*  Either the current chair of the committee has resigned as chair, or a new chair has been elected.
           *  if person_id matches the current chair, it is a resignation, otherwise replace whoever is currently
           *  the chair with the new person. (Note distinction between resigning as chair and staying on the
           *  committee, handled here, and the chair resigning from the committee, handled as a 'resignation' event.)
           */
            $chair_query = "SELECT id as \"committee_id\", chair_id FROM committees "
              . "WHERE committees.name = '{$request_object->committee_name}' ";
            $chair_result = pg_query($conn, $chair_query);
            $num = pg_num_rows($chair_result);
            if (1 !== $num) throw new Exception("{$request_object->committee_name} exists $num times");
            $row = pg_fetch_assoc($chair_result);
            $current_chair_id = $row['chair_id'];
            if ($current_chair_id === $request_object->person_id)
            {
              //  Chair resigned chairmanship, but not the seat.
              $update_query = "UPDATE committees set chair_id = NULL WHERE name = '{$request_object->committee_name}'";
              $update_result = pg_query($conn, $update_query);
              $num = pg_affected_rows($update_result);
              if (1 !== $num)
              {
                throw new Exception("Attempt to remove $num chairs from the {$request_object->committee_name}");
              }
              $event_query = "INSERT INTO seat_events (seat_id, person_id, is_chair_change, comment, operator_id) "
                . "VALUES ("
                . "{$request_object->seat_id}, {$request_object->person_id}, 't', "
                . "  (SELECT first_name||' '||last_name||' resigned as chair of {$request_object->committee_name}' "
                . "   FROM people "
                . "   WHERE id = {$request_object->person_id}), "
                . "{$_SESSION['person']['id']} )";
              $event_result = pg_query($conn, $event_query);
              //  Assert: one event was inserted successfully
              if (!$event_result) throw new Exception("Failed: '$event_query' :{pg_last_error($conn)}");
              $num_events = pg_affected_rows($event_result);
              if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            }
            else if ($current_chair_id === NULL)
            {
              //  There was no chair; put new one in place.
              $update_query = "UPDATE committees set chair_id = {$request_object->person_id} "
              . "WHERE name = '{$request_object->committee_name}'";
              $update_result = pg_query($conn, $update_query);
              $num = pg_affected_rows($update_result);
              if (1 !== $num)
              {
                throw new Exception("Attempt to add $num chairs to the {$request_object->committee_name}");
              }
              $event_query = "INSERT INTO seat_events (seat_id, person_id, is_chair_change, comment, operator_id) "
                . "VALUES ("
                . "{$request_object->seat_id}, {$request_object->person_id}, 't', "
                . "  (SELECT first_name||' '||last_name||' elected as chair of {$request_object->committee_name}.' "
                . "   FROM people "
                . "   WHERE id = {$request_object->person_id}), "
                . "{$_SESSION['person']['id']} )";
              $event_result = pg_query($conn, $event_query);
              //  Assert: one event was inserted successfully
              if (!$event_result) throw new Exception(pg_last_error($conn));
              $num_events = pg_affected_rows($event_result);
              if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            }
            else
            {
              //  One committee member replaces another as chair; same as if no chair, but different event comment
              $update_query = "UPDATE committees set chair_id = {$request_object->person_id} "
              . "WHERE name = '{$request_object->committee_name}'";
              $update_result = pg_query($conn, $update_query);
              $num = pg_affected_rows($update_result);
              if (1 !== $num)
              {
                throw new Exception("Attempt to add $num chairs to the {$request_object->committee_name}");
              }
              $event_query = "INSERT INTO seat_events (seat_id, person_id, is_chair_change, comment, operator_id) "
                . "VALUES ("
                . "{$request_object->seat_id}, {$request_object->person_id}, 't', "
                . "  (SELECT first_name||' '||last_name||' elected as chair of {$request_object->committee_name}' "
                . "   FROM people "
                . "   WHERE id = {$request_object->person_id})||', replacing '||"
                . "  (SELECT first_name||' '||last_name||'.' FROM people WHERE id = {$current_chair_id}), "
                . "{$_SESSION['person']['id']} )";
              $event_result = pg_query($conn, $event_query);
              //  Assert: one event was inserted successfully
              if (!$event_result) throw new Exception(pg_last_error($conn));
              $num_events = pg_affected_rows($event_result);
              if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            }
            pg_query($conn, "COMMIT");
            echo "OK";
            break;

          case 'pro-tem':
          /*  Check that the seat is actually occupied, that the replacement person
           *  is of the correct type, and that the election and expiration dates are sane.
           */
            if ($seat['person_id'] === "1") throw new Exception("Error: attempt to pro-temporize an open seat.");
            $person_result = pg_query($conn, "SELECT * FROM people WHERE id = {$request_object->person_id}");
            $person = pg_fetch_assoc($person_result);

            //  Check if the person is of the correct type for the seat
            check_person_seat_constraint($person, $seat);

              //  Check if the election date is sane
            $election_date = new DateTime($request_object->election_date);
            if ($election_date > $today) throw new Exception("Election date in future.");
            if ($election_date < $one_year_ago) throw new Exception("Election date over one year ago.");
              //  Check if the expiration date is sane
            $expiration_date = new DateTime($request_object->expiration_date);
            if ($expiration_date > $seat_expiration_date)
            {
              throw new Exception("Expiration date beyond the seat's expiration date.");
            }
            if ($expiration_date < $one_year_ago) throw new Exception("Expiration date over one year ago.");
            //  Insert the event record
            $columns = 'seat_id, person_id, is_pro_tem, event_date, operator_id';
            $values = "{$request_object->seat_id}";
            $values .= ", {$request_object->person_id}";
            $values .= ", 't'";
            $values .= ", '{$request_object->election_date}'::date";
            $values .= ", {$_SESSION['person']['id']}";
            $event_query = "INSERT INTO seat_events ($columns) VALUES ($values)";
            $result = pg_query($conn, $event_query);
            //  Assert: one event was inserted successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_events = pg_affected_rows($result);
            if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            //  Update the seat
            $values  = "  pro_tem_person_id={$request_object->person_id}";
            $values .= ", pro_tem_election_date='{$request_object->election_date}'::date";
            $values .= ", pro_tem_expiration_date='{$request_object->expiration_date}'::date";
            $result = pg_query($conn, "UPDATE seats set {$values} WHERE id = {$request_object->seat_id}");
            //  Assert: one seat was updated successfully
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_seats = pg_affected_rows($result);
            if (1 !== $num_seats) throw new Exception("Attempt to update {$num_seats} seats.");
            pg_query($conn, "COMMIT");
            echo "OK";
            break;

        case 'procedural':
          /*  Check that the seat is actually occupied, that there is a meaningful
           *  comment (properly punctuated and spelled, of course), and that the
           *  vacancy date is sane.
           */
            if ($seat['person_id'] === "1") throw new Exception("Error: attempt to vacate an open seat.");

            //  Check that the comment describing the event is complete, grammatically correct, and properly punctuated.
            if ($request_object->comment === '') throw new Exception("No explanation given for procedural vacancy.");

            //  Check if the vacancy date is sane
            $vacancy_date = new DateTime($request_object->vacancy_date);
            if ($vacancy_date > $today) throw new Exception("Vacancy date in future.");
            if ($vacancy_date < $one_year_ago) throw new Exception("Vacancy date over one year ago.");

            //  Insert the event record
            $columns = 'seat_id, person_id, is_procedural, event_date, comment, operator_id';
            $values = "{$request_object->seat_id}";
            $values .= ", {$request_object->person_id}";
            $values .= ", 't'";
            $values .= ", '{$request_object->vacancy_date}'::date";
            $values .= ", '{$request_object->comment}'";
            $values .= ", {$_SESSION['person']['id']}";
            $event_query = "INSERT INTO seat_events ($columns) VALUES ($values)";
            $result = pg_query($conn, $event_query);
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_events = pg_affected_rows($result);
            if (1 !== $num_events) throw new Exception("Attempt to create {$num_events} events.");
            //  Update the seat
            $values  = "  person_id = 1";
            $values .= ", election_date='{$request_object->vacancy_date}'::date";
            $result = pg_query($conn, "UPDATE seats set {$values} WHERE id = {$request_object->seat_id}");
            if (!$result) throw new Exception(pg_last_error($conn));
            $num_seats = pg_affected_rows($result);
            if (1 !== $num_seats) throw new Exception("Attempt to update {$num_seats} seats.");
            pg_query($conn, "COMMIT");
            echo "OK";
            break;
        default: die("Unrecognized: {$request_object->event_type}");
      }
    }
    catch (Exception $e)
    {
      pg_query($conn, "ROLLBACK");
      echo $e->getMessage();
      pg_close($conn);
    }
  }
?>

