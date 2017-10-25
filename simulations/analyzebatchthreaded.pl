#!/usr/bin/perl
use strict;
use List::Util qw( min max );
use threads;
use Thread::Semaphore;

if(scalar @ARGV == 0) {
	print "Usage: analyzebatch.pl nssfolder config=(idx|name),(idx|name),... stats=(idx|name),(idx|name),(idx|name),... [continuefrom=file.csv]\n";
	exit();
}

opendir my $dir, $ARGV[0] or die "Cannot open directory: $!";
my @files :shared;
@files = readdir $dir;


my @configIdx;
my @configparts = split('=',$ARGV[1]);
@configIdx = split(',', $configparts[1]);

my @statsIdx;
my @statsparts = split('=', $ARGV[2]);
@statsIdx = split(',', $statsparts[1]);

my $skipTimeUntil=999000000;


# no buffering of stdout so lines are force flushed immediately
my $old_fh = select(STDOUT);
$| = 1;
select($old_fh); 


# if continuing determine which files were already done
my %alreadyReadFiles :shared = {};
my $hasContinuationFile :shared = 0;
if(scalar @ARGV > 3) {
	my @parts = split("=", $ARGV[3]);
	if($parts[0] == "continuefrom") {
		# read the file and accumulate already read files
		print STDERR "Reading existing analysis from $parts[1]\n";
		open my $f, $parts[1] or die "Unable to continue from file\n";

		my $nameIdx = -1;
		while(my $line = <$f>) {
			chomp $line;
			my @lineparts = split(";", $line);

			if($. == 1) {
				for(my $i; $i < scalar @lineparts; $i++) {
					if($lineparts[$i] eq "Name") {
						$nameIdx = $i;
						last;
					}
				}
			}
			else {
				if($nameIdx != -1) {
					$alreadyReadFiles{$lineparts[$nameIdx] . ".nss"} = 1;
					$hasContinuationFile = 1;
				}
				else {
					die "Unable to determine Name column in continuefrom file\n";
				}
			}
		}
		close $f;
	}

	print STDERR "Continuation file read, " . (scalar keys %alreadyReadFiles) . " already read\n";
}
else {
	print STDERR "No continuation file specified, reading all nss files\n";
}

for(my $i = 0; $i < scalar @statsIdx; $i++) {
	if($statsIdx[$i] eq "DropTCPTxBufferExceeded") {
		# special case, bit of a hack,
		$statsIdx[$i] = 9999; # everything above 1000 idx should be treated as special i guess
	}
}


## NOTE: Each thread leaks about 2mb memory, so a Thread pool (queue) is obviously the better thing to use here
## but for a quick and dirty fast analysis this will have to do for now.

my $sem = Thread::Semaphore->new(8);

my $count :shared = 0;
my $nrProcessed :shared = 0;

my @threads = ();

for(my $t=0; $t < 16; $t++) {

	my $thr = threads->create(sub {

		my $stop = 0;
		while(!$stop) {
			my $f = "";
			{
				lock(@files);
				if(scalar @files > 0) {
					$f = shift @files;
				}
				else {
					$stop = 1;
				}
			}
			if($f ne "" && $f =~ /^.*?\.nss$/) {
				 my @pathParts = split("/", $f);
		                print STDERR "Processing file " . $pathParts[-1] . "\n";

		                if(!exists $alreadyReadFiles{$pathParts[-1]}) {
					my $printHeaders;
               			        {
		                	        lock($count);
	               			        $printHeaders = $count == 0 && !$hasContinuationFile; #only on the first line AND if there's no continuation from a file
		                        }
	
					analyzeFile($f, $printHeaders);
	
					{
						lock($count);
		        	                $count++;
					}
		                }
		                else {
		                        print STDERR "Already read $f in continuefrom file, skipping\n";
		                }		
			}
		}
		
	});
	push @threads, $thr;
}


for my $t (@threads) {
	$t->join();
}


my @statHeaders;
my @configHeaders;



sub analyzeFile {
   my $hasNodeStats=0;

   my $f = $ARGV[0] . "/" . @_[0];
   my $printHeaders = @_[1];

  # print "Checking file $f \n";
    open my $info, $f;

    if(!$info) {
       print STDERR "Could not open file $f!\n";
       return;
    }
   
     my @configParts;
     my @statParts;
     my $nrOfSta = 0;

     while(my $line = <$info>) {

		chomp $line;
		my @parts = split(";",$line);

		
		if($parts[1] eq "start") {
			# config line
			for my $idx (@configIdx) {
			  	push @configParts, $parts[$idx];
			}
		}
		elsif($parts[1] eq "startheader") {
			@configHeaders = (@parts);
			$configHeaders[0] = "time";
			$configHeaders[1] = "type";

			resolveConfigIdxNames();
		}
		elsif($parts[1] eq "nodestatsheader") {
			@statHeaders = (@parts);
			$statHeaders[0] = "time";
			$statHeaders[1] = "type";

			resolveIdxNames();
		}
		elsif($parts[1] eq "nodestats" && $parts[0] >= $skipTimeUntil) {
			$hasNodeStats = 1;
			if($parts[2] == 0) {
				# start of new nodestats batch
				@statParts = ();
				for my $idx (@statsIdx) {
					push @statParts, [];
				}
				$nrOfSta=0;
			}
			
			my $i = 0;
			for my $idx (@statsIdx) {
				my $val;
        	                if($idx > 1000) {
	                                # special case , handle manually here
	                                if($idx == 9999) { # tcpTxDrop
#						print $parts[25] . "\n" . $parts[26] . "\n";
                        	                $val = 0;
                	                        my @subParts = split(",",$parts[25]);
        	                                $val += $subParts[13];
	
	                                        @subParts = split(",", $parts[26]);
                                	        $val += $subParts[13];
                        	        }
                	        }
        	                else {
	                                $val = $parts[$idx];
	                        }

				push @{ $statParts[$i]}, $val;
				$i+=1;
			}
			$nrOfSta+=1;
		}
     }
     close $info;

#     for(my $i = 0; $i < scalar @statParts; $i++) {
#  	$statParts[$i] /= $nrOfSta;
#     }

     my $str = "";

     if($printHeaders) {
         my @headers;
         for my $idx (@configIdx) {
            push @headers, $configHeaders[$idx];
         }
         for my $idx (@statsIdx) {

		if($idx == 9999) {
		    push @headers, "DropTCPTxBufferExceeded";
		}
		else {
		    push @headers, $statHeaders[$idx];
		}
         }
         $str .= join(";", @headers);
         $str .= "\n";
     }

     if($hasNodeStats) {
	     $str .= join(";", @configParts);
	     $str .= ";";
	     $str .= join(";", map { getStatData($_) } @statParts);
	     $str .= "\n";
     }
     else {
	print STDERR "ERROR: File $f does not have node stats!\n";
    }

    {
       lock($nrProcessed);
       $nrProcessed++;
	print $str;
    }

    $sem->up();
#    return $str;
}

sub getStatData {
	my @arr = @{ @_[0] };

	my @sortedArray = sort { $a <=> $b } @arr;
	
	my $q1 = quartile(\@sortedArray, 0.25);
	my $q2 = quartile(\@sortedArray, 0.5);
	my $q3 = quartile(\@sortedArray, 0.75);

	my $maxVal = max @sortedArray;
	my $minVal = min @sortedArray;

	my $avg = mean(\@sortedArray);
	return "$avg,$q1,$q2,$q3,$minVal,$maxVal";
}

sub quartile {
	my @arr = @{ @_[0] };
	my $perc = @_[1];

	my $idx = (scalar @arr-1) * $perc;


        my $lower = int($idx);
        my $upper = $lower + 1,
        my $weight = $idx - $lower;

    	if ($upper >= scalar @arr) {
		return $arr[$lower];
	}
	return $arr[$lower] * (1 - $weight) + $arr[$upper] * $weight;
}

sub mean {
	my @arr = @{ @_[0] };

	my $sum = 0;
	for(my $i = 0; $i < scalar @arr; $i++) {
		$sum += $arr[$i];
	}
	return $sum /= scalar @arr;
}

sub resolveConfigIdxNames {
                        for(my $itm; $itm < scalar @configIdx; $itm++) {
                                my $item = $configIdx[$itm];
                                if($item =~ /[0-9]+/) {
                                        # ok already index
                                }
                                else {
                                        # try to find the matching index based on name
                                        for(my $i = 0; $i < scalar @configHeaders; $i++) {
                                                #print lc($statHeaders[$i]) . " <-> " . $item . "\n";
                                                if(lc($configHeaders[$i]) eq lc($item)) {
                                                        $configIdx[$itm] = $i; # update to index
#                                                        print "updated $statsIdx[$item] to $i because its equal to $item\n";
                                                        last;
                                                }
                                        }
                                }
                        }


}

sub resolveIdxNames {
                        for(my $itm; $itm < scalar @statsIdx; $itm++) {
                                my $item = $statsIdx[$itm];
                                if($item =~ /[0-9]+/) {
                                        # ok already index
                                }
                                else {
                                        # try to find the matching index based on name
                                        for(my $i = 0; $i < scalar @statHeaders; $i++) {
						#print lc($statHeaders[$i]) . " <-> " . $item . "\n";
                                                if(lc($statHeaders[$i]) eq lc($item)) {
                                                        $statsIdx[$itm] = $i; # update to index
#							print "updated $statsIdx[$item] to $i because its equal to $item\n";
                                                        last;
                                                }
                                        }
                                }
                        }
}
