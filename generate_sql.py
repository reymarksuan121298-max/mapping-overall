import csv
import io
import re

data = """AREA	MUNICIPALITIES	SPVR 	TELLER NAME	FRANCHISE	ADDRESS	LATITUDE	LONGITUDE
ILIGAN	ILIGAN	JESSENT PIZON	Rachel S. Badbaran	Glowing Fortune Gaming OPC	Seminary Drive Pala-o,Iligan City	8.230825	124.25158
ILIGAN	ILIGAN	JESSENT PIZON	Maria Perlina S. Laconia	Glowing Fortune Gaming OPC	DERBE ST. PALAO ILIGAN CITY	8.227184	124.239751
ILIGAN	ILIGAN	JESSENT PIZON	Jenie Vie Canen	Glowing Fortune Gaming OPC	Purok 3 Pugaan Iligan City	8.230127	124.280908
ILIGAN	ILIGAN	JESSENT PIZON	Maricel Polea	Glowing Fortune Gaming OPC	Purok 7 Saray,Illigan City	8.233027	124.236669
ILIGAN	ILIGAN	JESSENT PIZON	Jennelyn R. Echavez	Glowing Fortune Gaming OPC	PRK. SANTA TERESITA TUBOD ILIGAN CITY	8.214892	124.248526
ILIGAN	ILIGAN	JESSENT PIZON	Faith F. Meñoza	Glowing Fortune Gaming OPC	Prk Mauswagan Tubod Iligan City	8.212624	124.237588
ILIGAN	ILIGAN	JESSENT PIZON	Joshua M. Sanguenza	Glowing Fortune Gaming OPC	PRK. SAN ANTONIO, TUBOD ILIGAN CITY	8.219322	124.243737
ILIGAN	ILIGAN	JESSENT PIZON	Marlyn Subingsubing	Glowing Fortune Gaming OPC	Prk 1 Merila Ubaldo Laya	8.21092	124.251987
ILIGAN	ILIGAN	JESSENT PIZON	Liza R. Dayok	Glowing Fortune Gaming OPC	Purok 5 Upper Hinaplanon Iligan City	8.254432	124.264947
ILIGAN	ILIGAN	JESSENT PIZON	Nenita F. Arañas	Glowing Fortune Gaming OPC	Prk Orchids Villa Verde Iligan City	8.234107	124.244803
ILIGAN	ILIGAN	JESSENT PIZON	Edna Revelo	Glowing Fortune Gaming OPC	QUEZON AVENUE EXT. VILLAVERDE, ILIGAN CITY	8.228597	124.241425
ILIGAN	ILIGAN	JESSENT PIZON	Juvey Sanicolas	Glowing Fortune Gaming OPC	PUROK 10 RIVERSIDE PALA-O,ILIGAN CITY	8.219892	124.25754
ILIGAN	ILIGAN	JESSENT PIZON	Rendelou B. Lonoy	Glowing Fortune Gaming OPC	Purok 3 Puga-an, Iligan City	8.230075	124.276968
ILIGAN	ILIGAN	JESSENT PIZON	Jomel Werlan Abueme	Glowing Fortune Gaming OPC	PRK. ILANG-ILANG TUBOD, ILIGAN CITY	8.21738	124.240262
ILIGAN	ILIGAN	JESSENT PIZON	Anny V. Gaspayad	Glowing Fortune Gaming OPC	PRK. FALCATA HILLS TUBOD ILIGAN CITY	8.212306	124.237127
ILIGAN	ILIGAN	JESSENT PIZON	Mailyn A. Malasado	Glowing Fortune Gaming OPC		8.303227	124.259462
ILIGAN	ILIGAN	JASON MABINI	Jerame F. Maghinay 	Glowing Fortune Gaming OPC	Prk 1  Red Cross Digkilaan,Iligan City	8.247756	124.320927
ILIGAN	ILIGAN	JASON MABINI	Alma K. Ponce	Glowing Fortune Gaming OPC	Purok 3 Digkilaan,Iligan City	8.257833	124.328078
ILIGAN	ILIGAN	JASON MABINI	Mary Grace Sade	Glowing Fortune Gaming OPC	Purok Maglabid Digkilaan,Iligan City	8.258024	124.325213
ILIGAN	ILIGAN	JASON MABINI	Anjanet A. Quidlat	Glowing Fortune Gaming OPC	Prk -7 Malaigang Digkilaan,Iligan City	8.268438	124.334018
ILIGAN	ILIGAN	JASON MABINI	Geralene E. Japona	Glowing Fortune Gaming OPC	Purok 1 Digkilaan,Iligan City	8.247072	124.322002
ILIGAN	ILIGAN	JASON MABINI	Genilyn G. Gadapan	Glowing Fortune Gaming OPC	Prk 1 Curvada Mandulog Iligan City	8.253322	124.285015
ILIGAN	ILIGAN	JASON MABINI	Vicentesa C. Arado	Glowing Fortune Gaming OPC	Purok 19 Mandulog Iligan City	8.244168	124.310405
ILIGAN	ILIGAN	JASON MABINI	Marilyn D. Yañez	Glowing Fortune Gaming OPC	Purok 9  Bendol Mandulog Iligan City	8.246656	124.295301
ILIGAN	ILIGAN	JASON MABINI	Chona S. Bare	Glowing Fortune Gaming OPC	PRK. 6 SKY VILLAGE MANDULOG ILIGAN CITY	8.253249	124.294103
ILIGAN	ILIGAN	JASON MABINI	Jenefe Socorin	Glowing Fortune Gaming OPC	PRK 2 SAWSAW MANDULOG ILIGAN CITY	8.253083	124.288856
ILIGAN	ILIGAN	JASON MABINI	Ricardo R. Pepito	Glowing Fortune Gaming OPC	PUROK 13 SARAY- TIBANGA ILIGAN CITY	8.233805	124.242687
ILIGAN	ILIGAN	JASON MABINI	Katherine B. Diamada	Glowing Fortune Gaming OPC	Prk 9 Upper Hinaplanon Iligan City	8.257079	124.275878
ILIGAN	ILIGAN	JASON MABINI	Ethel Villarazo	Glowing Fortune Gaming OPC	Purok Upper Hinaplanon Ilagan City	8.255012	124.26702
ILIGAN	ILIGAN	JASON MABINI	Marigrace A. Villamor	Glowing Fortune Gaming OPC	Prk 7 Upper Hinaplanon Iligan City	8.256658	124.267633
ILIGAN	ILIGAN	JASON MABINI	Renaldo B. Longcob	Glowing Fortune Gaming OPC	PUROK 14 HINAPLANON,ILIGAN CITY	8.2607	124.281876
ILIGAN	ILIGAN	JASON MABINI	Marilyn A. Degamon	Glowing Fortune Gaming OPC	Purok 5 Upper Luinab Iligan City	8.243915	124.274663
ILIGAN	ILIGAN	JASON MABINI	Maricel Paquit	Glowing Fortune Gaming OPC	Purok Silica Digkilaan	8.254274	124.315894
ILIGAN	ILIGAN	JASON MABINI	Lim F. Ardiente Jr.	Glowing Fortune Gaming OPC	Purok 9 Upper Hinaplanon		
ILIGAN	ILIGAN	JASON MABINI	Aimae G. Librada	Glowing Fortune Gaming OPC	Purok 5 Upper Luinab Iligan City	8.243915	124.274663
ILIGAN	ILIGAN	JASON MABINI	Reynalie Gabisay	Glowing Fortune Gaming OPC	Prk-7 Tambo Hinaplanon,Iligan City	8.24493	124.262658
ILIGAN	ILIGAN	JASON MABINI	Susan R. Garay	Glowing Fortune Gaming OPC	Zone-3 Bagong Silang,Iligan City	8.24285	124.250827
ILIGAN	ILIGAN	JASON MABINI	Jonathan M. Gavino	Glowing Fortune Gaming OPC	Purok 5 Bonbonon,Iligan City	8.264633	124.28832
ILIGAN	ILIGAN	JASON MABINI	JANNIEN MARIE P. ARDIENTE	Glowing Fortune Gaming OPC	Prk 9 Upper Hinaplanon Iligan City		
ILIGAN	ILIGAN	JASON MABINI	DERESA D. BONTILAO	Glowing Fortune Gaming OPC	PRK 2 SAWSAW MANDULOG ILIGAN CITY	8.253083	124.288856
ILIGAN	ILIGAN	JASON MABINI	SEQUILA Q. LONGCOB	Glowing Fortune Gaming OPC	PUROK 14 HINAPLANON,ILIGAN CITY	8.2607	124.281876
ILIGAN	ILIGAN	JASON MABINI	Ashere G. Sumbran	Glowing Fortune Gaming OPC	Prk. 8-B, Santiago Iligan City	8.245846	124.254032
ILIGAN	ILIGAN	RIEL PIZON	An-An Austria	Glowing Fortune Gaming OPC	Zone 5 Dalipuga,Iligan City	8.305651	124.255542
ILIGAN	ILIGAN	RIEL PIZON	Antonio Odal	Glowing Fortune Gaming OPC	Purok 17 Dalipuga,Iligan City	8.304411	124.258192
ILIGAN	ILIGAN	RIEL PIZON	John Eufem A. Ramos	Glowing Fortune Gaming OPC	Purok 5 Godswill Paitan Dalipuga,Iligan City	8.311313	124.256678
ILIGAN	ILIGAN	RIEL PIZON	Lady Jean P. Daligdig	Glowing Fortune Gaming OPC	Purok 5-B Paitan Dalipuga,Iligan City	8.315491	124.250924
ILIGAN	ILIGAN	RIEL PIZON	Mariavic Capiluyan	Glowing Fortune Gaming OPC	Purok 19-B Dalipuga,Iligan City	8.306021	124.258973
ILIGAN	ILIGAN	RIEL PIZON	Norie P. Lumbab	Glowing Fortune Gaming OPC	Purok 5-B Paitan Dalipuga,Iligan City	8.314456	124.252719
ILIGAN	ILIGAN	RIEL PIZON	George Camingawan	Glowing Fortune Gaming OPC	Purok 5-B Paitan Dalipuga,Iligan City	8.304957	124.255895
ILIGAN	ILIGAN	RIEL PIZON	Luzviminda Noriga	Glowing Fortune Gaming OPC	PRK. 1-AB TAMBACAN ILIGAN CITY	8.220924	124.232772
ILIGAN	ILIGAN	RIEL PIZON	Rosalia V. Bomban	Glowing Fortune Gaming OPC	PRK 9-B TAMBACAN ILIGAN CITY	8.224892	124.23368
ILIGAN	ILIGAN	RIEL PIZON	Lilia B. Gabia	Glowing Fortune Gaming OPC	PUROK 1 TAMBACAN,ILIGAN CITY	8.226654	124.233893
ILIGAN	ILIGAN	RIEL PIZON	Dairyl Daligdig	Glowing Fortune Gaming OPC	VISTA VILLAGE DALIPUGA, ILIGAN CITY	8.314395	124.25608
ILIGAN	ILIGAN	RIEL PIZON	Merllyn Jean Abian	Glowing Fortune Gaming OPC	Purok 5-B Paitan Dalipuga,Iligan City	8.314121	124.251811
ILIGAN	ILIGAN	RIEL PIZON	Mardy Lyn Torres	Glowing Fortune Gaming OPC	PUROK 3-A RED CROSS HINAPLANON,ILIGAN CITY	8.248814	124.257122
ILIGAN	ILIGAN	RIEL PIZON	Hilly Mae D. Samson	Glowing Fortune Gaming OPC	Purok Tag-ibo Dalipuga, Iligan City	8.290425	124.258367
ILIGAN	ILIGAN	RIEL PIZON	Nora Fe G. De Lara	Glowing Fortune Gaming OPC	Purok 19-B Dalipuga,Iligan City	8.306021	124.258973
ILIGAN	ILIGAN	RIEL PIZON	Emie F. Castre	Glowing Fortune Gaming OPC	Purok 14 Dalipuga,Iligan City	8.306008	124.258975
ILIGAN	ILIGAN	RIEL PIZON	Liza Daligdig	Glowing Fortune Gaming OPC	VISTA VILLAGE DALIPUGA, ILIGAN CITY	8.314395	124.25608
ILIGAN	ILIGAN	RIEL PIZON	Creziel Abandula	Glowing Fortune Gaming OPC	Purok 17 Dalipuga,Iligan City	8.30509	124.257798
ILIGAN	ILIGAN	RIEL PIZON	Roland S. Billones	Glowing Fortune Gaming OPC	PRK. 1 TAMBACAN ILIGAN CITY	8.227155	124.23445
ILIGAN	ILIGAN	RIEL PIZON	EDEN MANZANO	Glowing Fortune Gaming OPC	Tag-Ibo Dalipuga,Iligan City	8.290531	124.258327
ILIGAN	ILIGAN	RIEL PIZON	Ivanna Cheska M. Ocoy	Glowing Fortune Gaming OPC	Purok Tag-ibo Dalipuga, Iligan City	8.290425	124.258367
ILIGAN	ILIGAN	RIEL PIZON	Adamson Torralba	Glowing Fortune Gaming OPC	Purok Abandon Dalipuga, Iligan City	8.299285	24.255232
ILIGAN	ILIGAN	IAN BALALA	Rolyn B. Roque 	Glowing Fortune Gaming OPC	Zone 9 Bagong Silang,Iligan City	8.239479	124.253521
ILIGAN	ILIGAN	IAN BALALA	Liz Angelene M. Verano	Glowing Fortune Gaming OPC	Zone 11 Bagong Silang,Iligan City	8.239994	124.255412
ILIGAN	ILIGAN	IAN BALALA	Ma. Estrella Abrera	Glowing Fortune Gaming OPC	Purok 14 Dalipuga,Iligan City	8.30532	124.260046
ILIGAN	ILIGAN	IAN BALALA	Henry Gomez	Glowing Fortune Gaming OPC	Phase 1 Purok 8 Kalubihon Dalipuga,Iligan City	8.304368	124.268962
ILIGAN	ILIGAN	IAN BALALA	Alfredo R. Loresto	Glowing Fortune Gaming OPC	Purok 4 Sto. Niño Kalubihon Dalipuga,Iligan City	8.29902	124.265139
ILIGAN	ILIGAN	IAN BALALA	Anna Marie P. Bancairen	Glowing Fortune Gaming OPC	Purok 17 Dalipuga,Iligan City	8.305731	124.257726
ILIGAN	ILIGAN	IAN BALALA	Ruina P. Montecillo	Glowing Fortune Gaming OPC	Purok 4 Tag-ibo Dalipuga,Iligan City	8.291782	124.257276
ILIGAN	ILIGAN	IAN BALALA	Christopher B. Uy	Glowing Fortune Gaming OPC	Purok 1-A Proper Hinaplanon,Iligan City	8.252265	124.264231
ILIGAN	ILIGAN	IAN BALALA	Felcon Opamin	Glowing Fortune Gaming OPC	Purok-1 Kiwalan,Iligan City	8.279266	124.267352
ILIGAN	ILIGAN	IAN BALALA	Erma C. Ramirez	Glowing Fortune Gaming OPC	PRK. 2A BRGY. SANTIAGO ILIGAN CITY	8.24493	124.242988
ILIGAN	ILIGAN	IAN BALALA	Amy C. Trillana	Glowing Fortune Gaming OPC	PUROK 2 GAMAO LUINAB ILIGAN CITY	8.24468	124.26732
ILIGAN	ILIGAN	IAN BALALA	Arlene M. Conui	Glowing Fortune Gaming OPC	PRK SAN FRANCISCO BRGY. VILLA VERDE ILIGAN CITY	8.228503	124.236298
ILIGAN	ILIGAN	IAN BALALA	Karla Grace D. Dela Cruz	Glowing Fortune Gaming OPC	Block 44 Lot 14 Vista Village Dalipuga, Iligan City	8.29902	124.265139
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Alma G. Lopez	Glowing Fortune Gaming OPC	Timoga Buru-un,Iligan City	8.192972	124.18297
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Glennice Mamentod	Glowing Fortune Gaming OPC	Mimbalot Buru-un,Iligan City	8.175347	124.176458
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Mary Love B. Sese	Glowing Fortune Gaming OPC	Purok Ilang-Ilang Upper Ditucalan,Iligan City	8.166741	124.192996
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Vhea Stella Mariz Clapano	Glowing Fortune Gaming OPC	CONSUNJI ST., POBLACION ILIGAN CITY	8.229935	124.240813
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Dalisay Limpangog	Glowing Fortune Gaming OPC	ZONE CAPRICORN BRGY. SUAREZ,ILIGAN CITY	8.193368	124.215252
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Helen Dalahay	Glowing Fortune Gaming OPC	ZONE METEOR IISHAI SUAREZ, ILIGAN CITY	8.178702	124.217297
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Vilme G. Layar	Glowing Fortune Gaming OPC	Zone Access Suarez, Iligan City	8.20151	124.210575
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Quennie S. Abutanmo	Glowing Fortune Gaming OPC	Zone River Valley Suarez,Iligan City	8.19865	124.1207887
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Cristy P. Agumana	Glowing Fortune Gaming OPC	ZONE MADASIGON 2, SUAREZ, ILIGAN CITY	8.185908	124.214948
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Faisal A. Imam	Glowing Fortune Gaming OPC	MACAPAGAL HIWAY TERMINAL NSC Suarez,Iligan City	8.208205	124.216142
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Desiree Joy  O. Demavivas	Glowing Fortune Gaming OPC	PRK.11 CARITAS UPPER TOMINOBO, ILIGAN CITY	8.183949	124.22152
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Catherine S. Loyola	Glowing Fortune Gaming OPC	P1 Upper tominobo Iligan City	8.17631	124.2231
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Irene C. Zuniega	Glowing Fortune Gaming OPC	ZONE JUPITER SUAREZ, ILIGAN CITY	8.191477	124.216178
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Miguelita S. Zamora	Glowing Fortune Gaming OPC	Purok 5 Bliss Bolangan Mimbalot Buru-un,Iligan City	8.18153	124.173327
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Maya Joan Omaña	Glowing Fortune Gaming OPC	Purok 7 Buru-un,Iligan City	8.188328	124.17295
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Kevin Rashdy Homdos	Glowing Fortune Gaming OPC	Purok 12 Timoga Buru-un,Iligan City	8.1915803	124.179547
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Elmer Fernandez	Glowing Fortune Gaming OPC	PRK.8 CARITAS UPPER TOMINOBO, ILIGAN CITY	Lat 8.183803	124.221685
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Melani I. Columna	Glowing Fortune Gaming OPC	ZONE MADASIGON 1 SUAREZ ILIGAN CITY	8.186832	124.216842
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Angelica M. Quintana	Glowing Fortune Gaming OPC	ZONE PISCES 1 SUAREZ Iligan City	8.188098	124.21516
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Jamiaca Grace Canedo	Glowing Fortune Gaming OPC	P1 Upper tominobo Iligan City	8.17631	124.2231
ILIGAN	ILIGAN	JACKSON LIMPANGOG	Nilo U. Layar	Glowing Fortune Gaming OPC	Zone River Valley Suarez,Iligan City	8.19865	124.1207887
ILIGAN	ILIGAN	IVAN AGCOPRA	Gemma P. Tampon	Glowing Fortune Gaming OPC	Zone 13 Abuno,Iligan City	8.176854	124.245002
ILIGAN	ILIGAN	IVAN AGCOPRA	Grace A. Dumaguit	Glowing Fortune Gaming OPC	Zone 01 Abuno,Iligan City	8.187398	124.256363
ILIGAN	ILIGAN	IVAN AGCOPRA	Angelina A. Pelarion	Glowing Fortune Gaming OPC	Zone 15 Fatima Abuno,Iligan City	8.167481	124.242542
ILIGAN	ILIGAN	IVAN AGCOPRA	Milagros Capangpangan	Glowing Fortune Gaming OPC	Zone 6 MalindawagAbuno,Iligan City	8.178121	124.257522
ILIGAN	ILIGAN	IVAN AGCOPRA	Sharon Grace A. Pacquiao	Glowing Fortune Gaming OPC	Purok 7 Pala-o,Iligan City	8.219578	124.254717
ILIGAN	ILIGAN	IVAN AGCOPRA	Lovely Mae Alao	Glowing Fortune Gaming OPC	Gen. Aguinaldo St. Extension Palao, Iligan City	8.227427	124.241611
ILIGAN	ILIGAN	IVAN AGCOPRA	Alejandro Alcisto	Glowing Fortune Gaming OPC	PRK. 6, STA. ELENA ,ILIGAN CITY	8.192776	124.230837
ILIGAN	ILIGAN	IVAN AGCOPRA	Michael Jack T. Capangpangan	Glowing Fortune Gaming OPC	PUROK 13 TIPANOY ILIGAN CITY	8.19999	124.24772
ILIGAN	ILIGAN	IVAN AGCOPRA	Judith C. Sedrome	Glowing Fortune Gaming OPC	PRK. 20 SCIONS TOMAS CABILI, ILIGAN CITY	8.201345	124.230591
ILIGAN	ILIGAN	IVAN AGCOPRA	Mary S. Portacion	Glowing Fortune Gaming OPC	PRK 20-A TOMAS CABILI ILIGAN CITY	8.20163	124.230541
ILIGAN	ILIGAN	IVAN AGCOPRA	Marichu Q. Bajarias	Glowing Fortune Gaming OPC	PRK UBHAI BARA-AS TUBOD, ILIGAN CITY	8.204099	124.23692
ILIGAN	ILIGAN	IVAN AGCOPRA	Aldrei Jhon Macaraig	Glowing Fortune Gaming OPC	PUROK 7 PALA-O,ILIGAN CITY	8.22042	124.254516
ILIGAN	ILIGAN	IVAN AGCOPRA	Jennylou B. Paglinawan	Glowing Fortune Gaming OPC	Purok-9 Casa  Village Tominobo, Iligan City		
ILIGAN	ILIGAN	IVAN AGCOPRA	Irene L. Perater	Glowing Fortune Gaming OPC	Block 1 Lot 3 Prk. 3 Tipanoy, Iligan City	8.207191	124.251744
ILIGAN	ILIGAN	IVAN AGCOPRA	Annalyn F. Tan	Glowing Fortune Gaming OPC	Palao, Prk. 7, Iligan City	8.219578	124.254717
ILIGAN	ILIGAN	IVAN AGCOPRA	Jenalyn Delas Alas	Glowing Fortune Gaming OPC	Sta. Elena Prk. 6, Iligan City	8.192776	124.230837
ILIGAN	ILIGAN	IVAN AGCOPRA	Rhea Jean Englis	Glowing Fortune Gaming OPC	Pindugangan Prk. 1B, Iligan City	8.190466	124.263758
ILIGAN	ILIGAN	IVAN AGCOPRA	Trixie Shamen Quirol	Glowing Fortune Gaming OPC	Abuno, Panul-iran Zone 03, Iligan City	8.180609	124.249335
ILIGAN	ILIGAN	IVAN AGCOPRA	Cleofe T. Repole	Glowing Fortune Gaming OPC	Purok 6A Tipanoy Iligan city	8.199044	124.251089
ILIGAN	ILIGAN	COOR SETB	Susan R. Garay	Glowing Fortune Gaming OPC	Zone-3 Bagong Silang,Iligan City	8.24285	124.250827
ILIGAN	ILIGAN	COOR SETB	Kevin Rashdy Homdos	Glowing Fortune Gaming OPC	Purok 12 Timoga Buru-un,Iligan City	8.1915803	124.179547
ILIGAN	ILIGAN	COOR SETB	Maya Joan Omaña	Glowing Fortune Gaming OPC	Purok 7 Buru-un,Iligan City	8.188328	124.17295
ILIGAN	ILIGAN	COOR SETB	Miguelita S. Zamora	Glowing Fortune Gaming OPC	Purok 5 Bliss Bolangan Mimbalot Buru-un,Iligan City	8.18153	124.173327
ILIGAN	ILIGAN	COOR SETB	Emie F. Castre	Glowing Fortune Gaming OPC	Purok 14 Dalipuga,Iligan City	8.306008	124.258975
ILIGAN	ILIGAN	COOR SETB	Jacqueline Abellanosa	Glowing Fortune Gaming OPC	#0072 Zone 1-A Del Carmen,Iligan City	8.232588	124.257377
ILIGAN	ILIGAN	COOR SETB	Jaypril D. Roxas	Glowing Fortune Gaming OPC	Square Garden Hinaplanon,Iligan City	8.247495	124.261517
ILIGAN	ILIGAN	COOR SETB	Angelica Actub	Glowing Fortune Gaming OPC	PRK 6 A TAMBO HINAPLANON I. C	8.245349	124.256124
ILIGAN	ILIGAN	COOR SETB	Reynalie Gabisay	Glowing Fortune Gaming OPC	Prk-7 Tambo Hinaplanon,Iligan City	8.24493	124.262658
ILIGAN	ILIGAN	COOR SETB	Emerose B. Abuzo 	Glowing Fortune Gaming OPC	Purok-7 Kiwalan,Iligan City	8.284312	124.26448
ILIGAN	ILIGAN	COOR SETB	Mia Fe Monsanto	Glowing Fortune Gaming OPC	Acmac,Iligan City	8.28122	124.266154
ILIGAN	ILIGAN	COOR SETB	Fedinand Pilar JR.	Glowing Fortune Gaming OPC	U&j Building 2 Aguinaldo Chico St. Pala-o,Iligan City	8.226978	124.244297
ILIGAN	ILIGAN	COOR SETB	Jaira A. Talaroc	Glowing Fortune Gaming OPC	Zone 10 Seaside Poblacion Iligan City	8.229584	124.233696
ILIGAN	ILIGAN	COOR SETB	Adelene C. Seniagan	Glowing Fortune Gaming OPC	0050 Purok De Oro Lluch St. Poblacion Iligan City	8.230884	124.240006
ILIGAN	ILIGAN	COOR SETB	Racel P. Basnillo	Glowing Fortune Gaming OPC	Zone 9 Area  Poblacion Iligan city	8.231495	124.233576
ILIGAN	ILIGAN	COOR SETB	Rosalinda M. Ampaso	Glowing Fortune Gaming OPC	QUEZON AVENUE NEAR MERCURY DRUGS Iligan City	8.22913	124.236898
ILIGAN	ILIGAN	COOR SETB	Jonas Bryan Yongco	Glowing Fortune Gaming OPC	Purok 7 Tambo Hinaplanon,Iligan City	8.24401	124.25935
ILIGAN	ILIGAN	COOR SETB	Telly  R. Sagal	Glowing Fortune Gaming OPC	 Brgy San Miguel Iligan City	8.236901	124.246523
ILIGAN	ILIGAN	COOR SETB	Maridel Gomez	Glowing Fortune Gaming OPC	Purok 2B Barangay Santiago Iligan City	8.244166	124.243035
ILIGAN	ILIGAN	COOR SETB	Marianne M. Pescador	Glowing Fortune Gaming OPC	PRK. 4-A SANTIAGO ILIGAN CITY	8.247452	124.243463
ILIGAN	ILIGAN	COOR SETB	Era Manette Iglupas	Glowing Fortune Gaming OPC	Prk 5A Brgy. Santiago, Iligan City	8.249864	124.243889
ILIGAN	ILIGAN	COOR SETB	John Vincent Coma	Glowing Fortune Gaming OPC	Purok Roosevelt Saray,Iligan City	8.232834	124.237423
ILIGAN	ILIGAN	COOR SETB	Emelyn G. Borres	Glowing Fortune Gaming OPC	Purok 8 Canaway-Tibanga,Iligan City	8.239674	124.240517
ILIGAN	ILIGAN	COOR SETB	Angelica M. Quintana	Glowing Fortune Gaming OPC	ZONE PISCES 1 SUAREZ Iligan City	8.188098	124.21516
ILIGAN	ILIGAN	COOR SETB	Aidren C. Samson	Glowing Fortune Gaming OPC	ZONE MERCURY Suarez  Iligan City	8.191392	124.214618
ILIGAN	ILIGAN	COOR SETB	Marina J. Surnido	Glowing Fortune Gaming OPC	Zone Libra Suarez, Iligan City	8.188903	124.217147
ILIGAN	ILIGAN	COOR SETB	Roland S. Billones	Glowing Fortune Gaming OPC	PRK. 1 TAMBACAN ILIGAN CITY	8.227155	124.23445
ILIGAN	ILIGAN	COOR SETB	NN S. Castro	Glowing Fortune Gaming OPC	Purok 2 Tambacan Iligan City	8.22605	124.236105
ILIGAN	ILIGAN	COOR SETB	Fernando D. Yordan	Glowing Fortune Gaming OPC	Purok 13 Brgy. Tibanga, Iligan City	8.241327	124.241054
ILIGAN	ILIGAN	COOR SETB	Cleofe T. Repole	Glowing Fortune Gaming OPC	Purok 6A Tipanoy Iligan city	8.199044	124.251089
ILIGAN	ILIGAN	COOR SETB	Rey P. Llauderes	Glowing Fortune Gaming OPC	PRK 8 TIPANOY ILIGAN CITY	8.195827	124.253796
ILIGAN	ILIGAN	COOR SETB	John Michael Balaba	Glowing Fortune Gaming OPC	PRK.21 LANDLESS TIPANOY	8.197023	124.248077
ILIGAN	ILIGAN	COOR SETB	Angelie Candillada	Glowing Fortune Gaming OPC	PRK 14 TOMINOBO,ILIGAN CITY	8.20878	124.219215
ILIGAN	ILIGAN	COOR SETB	Janssen Cates  S. Simprota	Glowing Fortune Gaming OPC	PRK. 7 TOMINOBO, ILIGAN CITY	8.210602	124.222848
ILIGAN	ILIGAN	COOR SETB	Fe Maris Panuncialman	Glowing Fortune Gaming OPC	P1 Camague Tomas Cabili Iligan City 	8.212268	124.231495
ILIGAN	ILIGAN	COOR SETB	Agnes Tanguamos	Glowing Fortune Gaming OPC	CAMAGUE TOMAS CABILI ILIGAN CITY	8.214398	124.226188
ILIGAN	ILIGAN	COOR SETB	Jeson Tanguamos	Glowing Fortune Gaming OPC	Purok 2-Camague Tomas Cabili,Iligan City	8.212115	124.229112
ILIGAN	ILIGAN	COOR SETB	Richard Cabral	Glowing Fortune Gaming OPC	0001 4TH EXT. TUBOD ROSARIO HEIGHTS, ILIGAN CITY	8.213925	124.240605
ILIGAN	ILIGAN	COOR SETB	Margyrie D. Villanueva	Glowing Fortune Gaming OPC	PRK MAPAG-UNLAD TUBOD ILIGAN CITY	8.209547	124.236152
ILIGAN	ILIGAN	COOR SETB	Ian Rey Alad-ad	Glowing Fortune Gaming OPC	LAVILLE BARAAS TUBOD Iligan City	8.209312	124.24249
ILIGAN	ILIGAN	COOR SETB	Monena N. Catam-isan	Glowing Fortune Gaming OPC	Brgy. Tubod Iligan City	8.216084	124.244143
ILIGAN	ILIGAN	COOR SETB	Victor N. Magoncia	Glowing Fortune Gaming OPC	Prk. Lakambini 10east Tubod Rosario Heights Iligan City	8.21338	124.243075
ILIGAN	ILIGAN	COOR SETB	Melvin Chiu	Glowing Fortune Gaming OPC	PUROK SAN MIGUEL BRGY TUBOD	8.217267	124.231735
ILIGAN	ILIGAN	COOR SETB	Rafael A. Dizon	Glowing Fortune Gaming OPC	CARBIDE VILLAGE TUBOD	8.209052	124.238363
ILIGAN	ILIGAN	COOR SETB	Norielyn Catemprato	Glowing Fortune Gaming OPC	ZONE ARMY VILLAGE SUAREZ, ILIGAN CITY	8.185117	124.21579
ILIGAN	ILIGAN	COOR SETB	Maureen Mae A. Banua	Glowing Fortune Gaming OPC	Purok-7 Upper Hinaplanon	8.255767	124.268595
ILIGAN	ILIGAN	COOR SETB	Jessica Tumada	Glowing Fortune Gaming OPC	Tambo Market Proper Hinaplanon,Iligan City	8.243402	124.259767
ILIGAN	ILIGAN	COOR SETB	Queency C. Falcon	Glowing Fortune Gaming OPC	Palao, Gen. Aguinaldo Jeffrey Road Ext., Iligan City	8.226777	124.245013
ILIGAN	ILIGAN	COOR SETB	Emalyn Ellevera	Glowing Fortune Gaming OPC	Pob. Mahayahay, Prk. Bagong Lipunan, Iligan City	8.221658	124.240512
ILIGAN	ILIGAN	COOR SETB	Gerald S. Agpalo	Glowing Fortune Gaming OPC	PUROK SAN MIGUEL BRGY TUBOD	8.217267	124.231735
ILIGAN	ILIGAN	COOR SETB	JEANETH JOY M. RAMIREZ	Glowing Fortune Gaming OPC	PRK. 4 SANTIAGO ILIGAN CITY		
ILIGAN	ILIGAN	COOR SETB	REY BARCENILLA	Glowing Fortune Gaming OPC	Purok 2-Camague Tomas Cabili,Iligan City	8.212115	124.229112
ILIGAN	ILIGAN	COOR SETB	Emmallyn Ellevera		Mahayahay,Poblacion		
"""

def clean_val(val):
    val = val.strip()
    if not val:
        return 'NULL'
    # Escape single quotes
    val = val.replace("'", "''")
    return f"'{val}'"

def parse():
    reader = csv.reader(io.StringIO(data.strip()), delimiter='\\t')
    header = next(reader)
    
    # We will assume a table called `employees`
    # Columns: area, municipalities, spvr, teller_name, franchise, address, latitude, longitude
    columns = ["area", "municipalities", "spvr", "teller_name", "franchise", "address", "latitude", "longitude"]
    
    inserts = []
    inserts.append(f"INSERT INTO employees ({', '.join(columns)}) VALUES")
    
    values_list = []
    for row in reader:
        if len(row) < 8:
            # Pad with empty strings if row is short
            row.extend([''] * (8 - len(row)))
        elif len(row) > 8:
            row = row[:8]
            
        area = clean_val(row[0])
        municipalities = clean_val(row[1])
        spvr = clean_val(row[2])
        teller_name = clean_val(row[3])
        franchise = clean_val(row[4])
        address = clean_val(row[5])
        
        # Lat/Long might need to be numeric or NULL if empty
        lat = row[6].strip().replace("Lat ", "")
        lng = row[7].strip()
        
        lat_val = lat if lat else "NULL"
        lng_val = lng if lng else "NULL"
        
        # Some are just text like 'Lat 8.183803', we already stripped 'Lat '
        try:
            if lat_val != "NULL":
                float(lat_val)
        except ValueError:
            lat_val = f"'{lat_val}'" # fallback to string if not float
            
        try:
            if lng_val != "NULL":
                float(lng_val)
        except ValueError:
            lng_val = f"'{lng_val}'" # fallback
            
        row_str = f"  ({area}, {municipalities}, {spvr}, {teller_name}, {franchise}, {address}, {lat_val}, {lng_val})"
        values_list.append(row_str)
        
    inserts.append(",\\n".join(values_list) + ";")
    
    with open('c:\\\\Users\\\\Reymark Suan\\\\Desktop\\\\FILES\\\\Projects\\\\mapping-overall\\\\employees_insert.sql', 'w', encoding='utf-8') as f:
        f.write("\\n".join(inserts) + "\\n")

if __name__ == '__main__':
    parse()
