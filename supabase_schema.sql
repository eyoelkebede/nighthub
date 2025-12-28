-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  bio text,
  avatar_url text,
  followers_count int default 0,
  following_count int default 0,
  latitude float,
  longitude float,
  status text,
  last_active timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Posts
create table posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  content text,
  type text check (type in ('text', 'video-short', 'video-long')),
  media_url text,
  thumbnail_url text,
  is_premium boolean default false,
  unlock_price numeric,
  likes_count int default 0,
  comments_count int default 0,
  shares_count int default 0,
  tips_amount numeric default 0,
  created_at timestamptz default now()
);

-- Stories
create table stories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('image', 'video')),
  media_url text,
  duration int default 5,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- User Finance
create table user_finance (
  user_id uuid references profiles(id) on delete cascade not null primary key,
  wallet_address text,
  banking_info text, -- Encrypted in app
  total_earnings numeric default 0,
  earnings_breakdown jsonb default '{"ads": 0, "walking": 0, "gaming": 0, "tips": 0, "subscriptions": 0}'::jsonb,
  daily_steps int default 0,
  updated_at timestamptz default now()
);

-- Follows
create table follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Quests (Dynamic)
create table quests (
  id serial primary key,
  task text not null,
  reward numeric not null,
  total_steps int not null, -- e.g. 3 ads, 10 likes
  type text not null, -- 'ads', 'engagement', 'content'
  created_at timestamptz default now()
);

-- User Quest Progress
create table user_quests (
  user_id uuid references profiles(id) on delete cascade not null,
  quest_id int references quests(id) on delete cascade not null,
  progress int default 0,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, quest_id)
);

-- RLS Policies (Basic)
alter table profiles enable row level security;
alter table posts enable row level security;
alter table stories enable row level security;
alter table user_finance enable row level security;
alter table follows enable row level security;
alter table quests enable row level security;
alter table user_quests enable row level security;

-- Public read access
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Public posts are viewable by everyone" on posts for select using (true);
create policy "Public stories are viewable by everyone" on stories for select using (true);

-- Auth insert/update
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

create policy "Users can insert their own posts" on posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own posts" on posts for update using (auth.uid() = user_id);

create policy "Users can insert their own stories" on stories for insert with check (auth.uid() = user_id);

create policy "Users can view their own finance" on user_finance for select using (auth.uid() = user_id);
create policy "Users can update their own finance" on user_finance for update using (auth.uid() = user_id);
create policy "Users can insert their own finance" on user_finance for insert with check (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, bio, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'bio', new.raw_user_meta_data->>'avatar_url');
  
  insert into public.user_finance (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
