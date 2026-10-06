-- Normalize exact catalog matches; preserve original values for rollback.
create table public._backup_violation_type_20261003 as
select id, type from public.violations where type is null or type = 'general';
alter table public._backup_violation_type_20261003 enable row level security;
revoke all on table public._backup_violation_type_20261003 from public, anon, authenticated;
grant select on table public._backup_violation_type_20261003 to service_role;

do $repair$
declare updated_rows integer;
begin
with catalog(code, description) as (values
('01','Terlambat masuk sekolah'),
('02','Tanpa bedge lokasi / Atribut sekolah (Topi, dasi, Rompi Dll.)'),
('03','Tidak bersepatu hitam dan berkaos kaki putih'),
('04','Tidak berpakaian rapi /dimodelkan'),
('05','Memakai jaket, sweater atau rompi di sekolah tanpa ada izin'),
('06','Tidak pakai topi saat upacara'),
('07','Memakai aksesori (contoh: gelang, topi)'),
('08','Tanpa tali pinggang hitam'),
('09','Keluar masuk ruang tanpa izin guru'),
('10','Terlambat masuk setelah istirahat'),
('11','Tidak memperhatikan saat KBM'),
('12','Membuang sampah sembarangan'),
('13','Berkuku panjang bagi putra-putri'),
('14','Tidak patuh pada instruksi guru/petugas'),
('15','Pemalsuan identitas (atribut, kartu, atau tanda pengenal sekolah lain)'),
('16','Pakaian dicoret-coret'),
('17','Tidak memakai seragam olahraga pada saat jam pelajaran olahraga'),
('18','Tidak mengikuti kegiatan pembinaan keagamaan tanpa alasan yang jelas'),
('19','Memakai make-up dan perhiasan yang berlebihan bagi putri'),
('20','Makan sambil berdiri'),
('21','Membeli jajan di luar kantin sekolah'),
('22','Mencoret-coret area sekolah (meja, tembok, dll.)'),
('23','Bermain kertas (disobek, mainan pesawat, dll.)'),
('24','Bermain di jam pelajaran'),
('25','Berkata kotor'),
('26','Memakai barang bukan miliknya'),
('27','Masuk di kelas lain tanpa izin'),
('28','Tidak mengikuti upacara bendera'),
('29','Pulang sekolah sebelum pelajaran selesai'),
('30','Kabur pada jam pelajaran'),
('31','Bawa HandPhone ke sekolah'),
('32','Membawa komik, majalah, atau novel'),
('33','Alpha >3 hari tanpa keterangan'),
('34','Membuat keterangan palsu'),
('35','Rambut panjang, Punk (L)'),
('36','Mencat rambut dan bertato (L/P)'),
('37','Pelecehan terhadap siswi perempuan'),
('38','Merusak fasilitas sekolah'),
('39','Ribut/mengganggu proses belajar'),
('40','Mengganggu barang/kendaraan guru dan staf'),
('41','Pemalsuan nilai dan tanda tangan Kepala sekolah, guru dan staf tata usaha'),
('42','Mengolok-olok teman/mengejek'),
('43','Melawan/menghina/mengejek kepala sekolah, guru, dan staf TU'),
('44','Meloncat pagar sekolah'),
('45','Berkelahi/tawuran'),
('46','Membawa senjata tajam'),
('47','Mencuri'),
('48','Membawa buku, kaset, VCD Terlarang'),
('49','Menodong teman'),
('50','Melabrak teman/adik kelas'),
('51','Perjudian'),
('52','Pengeroyokan/pemukulan'),
('53','Adu domba/provokasi'),
('54','Pencemaran nama baik sekolah'),
('55','Merokok / membawa rokok'),
('56','Mengintimidasi /Meneror teman'),
('57','Tidak membawa buku pelajaran / alat tulis / perlengkapan belajar'),
('58','Tidak mengerjakan Pekerjaan Rumah (PR) / tugas mandiri'),
('59','Makan atau mengunyah makanan/permen saat KBM berlangsung'),
('60','Membawa mainan pribadi (kartu, gasing, boneka, lato-lato) ke dalam kelas'),
('61','Bercanda atau tidak tertib saat berdoa bersama / apel pagi'),
('62','Meninggalkan tugas piket kebersihan kelas tanpa izin'),
('63','Mencontek saat ulangan atau asesmen'),
('64','Mendorong, mencubit, atau menjahili teman saat bermain/antre'),
('65','Menyalahgunakan HP / gawai saat jam pelajaran tanpa instruksi guru'),
('66','Menggunakan Vape / Rokok Elektrik / Pods di lingkungan sekolah'),
('67','Memalak / meminta uang saku atau barang teman secara paksa'),
('68','Tidak mengikuti Sholat Berjamaah / Sholat Dhuha / Dzuhur tanpa uzur'),
('69','Membawa, mengonsumsi, atau mengedarkan Miras / Narkoba / Obat Terlarang (NAPZA)'),
('70','Perundungan siber (Cyberbullying) atau pelecehan melalui media sosial / grup chat'),
('71','Judi online / slot / taruhan digital saat jam sekolah'),
('72','Membawa benda berbahaya / petasan / bahan peledak ke sekolah'),
('73','Menyimpan, melihat, atau menyebarkan konten/media pornografi digital'))
update public.violations v
set type = c.code
from catalog c
where c.description = v.description
  and (v.type is null or v.type = 'general');
get diagnostics updated_rows = row_count;
if updated_rows <> 176 then
  raise exception 'Expected 176 normalized violations, got %; transaction aborted', updated_rows;
end if;
end;
$repair$;
